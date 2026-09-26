import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../src/main/database.js';
import { createSessionService } from '../src/main/session-service.js';

const roots = [];
function setup(times) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studyvault-focus-'));
  roots.push(root);
  const db = openDatabase(path.join(root, 'studyvault.db'));
  db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('vault_path',?)").run(path.join(root, 'vault'));
  db.prepare("INSERT INTO categories(id,name,created_at) VALUES('design','Design',?)").run(new Date(0).toISOString());
  db.prepare("INSERT INTO tasks(id,title,description,due_at,category_id,status,created_at,updated_at,completed_at) VALUES('task-1','Write report','',NULL,'design','Active',?,?,NULL)").run(new Date(0).toISOString(), new Date(0).toISOString());
  let index = 0;
  return { db, service: createSessionService(db, { now: () => new Date(times[Math.min(index++, times.length - 1)]) }) };
}
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe('session lifecycle', () => {
  it('stores a task title snapshot and excludes pauses from active time', () => {
    const { db, service } = setup([0, 10000, 30000, 50000, 65000, 100000]);
    const session = service.startSession({ type: 'Focus', plannedSeconds: 1500, taskId: 'task-1' });
    service.pauseSession(session.id); service.resumeSession(session.id); service.pauseSession(session.id); service.resumeSession(session.id);
    const completed = service.finishSession(session.id, 'Completed');
    expect(completed.actual_seconds).toBe(65);
    expect(completed.context_snapshot).toBe('Write report');
    expect(db.prepare("SELECT count(*) count FROM log_events WHERE event_type='session.completed'").get().count).toBe(1);
    expect(service.finishSession(session.id, 'Completed').id).toBe(session.id);
    expect(db.prepare("SELECT count(*) count FROM log_events WHERE event_type='session.completed'").get().count).toBe(1);
    db.close();
  });

  it('requires context for Focus and permits a context-free Break', () => {
    const { db, service } = setup([0, 12000]);
    expect(() => service.startSession({ type: 'Focus', plannedSeconds: 60 })).toThrow('Choose an active task or enter an activity');
    const session = service.startSession({ type: 'Break', plannedSeconds: 300 });
    expect(service.finishSession(session.id, 'Cancelled').outcome).toBe('Cancelled');
    db.close();
  });

  it('reports timestamp-based active and remaining seconds for a restored session', () => {
    const { db, service } = setup([0, 10000, 30000, 40000]);
    const session = service.startSession({ type: 'Focus', plannedSeconds: 60, taskId: 'task-1' });
    service.pauseSession(session.id); service.resumeSession(session.id);
    expect(service.currentSession()).toMatchObject({ active_seconds: 20, remaining_seconds: 40 });
    db.close();
  });

  it('completes the linked task while retaining the session snapshot', () => {
    const { db, service } = setup([0, 1000, 2000]);
    const session = service.startSession({ type: 'Focus', plannedSeconds: 60, taskId: 'task-1' });
    db.prepare("UPDATE tasks SET title='Renamed' WHERE id='task-1'").run();
    expect(() => service.completeLinkedTask(session.id)).toThrow('Complete the Focus session first');
    service.finishSession(session.id, 'Completed');
    service.completeLinkedTask(session.id);
    expect(db.prepare("SELECT status FROM tasks WHERE id='task-1'").get().status).toBe('Completed');
    expect(service.listHistory()[0].context_snapshot).toBe('Write report');
    db.close();
  });
});
