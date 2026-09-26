import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../src/main/database.js';
import { deliverEvent, formatSessionEvent, retryAllEvents } from '../src/main/event-service.js';

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
const event = { id: 'evt-focus-1', eventType: 'session.completed', occurredAt: '2026-09-26T11:00:00.000Z', timezoneOffset: '+02:00', sourceApp: 'StudyVault Focus', sessionId: 'session-1', sessionType: 'Focus', status: 'Completed', plannedSeconds: 1500, actualSeconds: 1438, contextSnapshot: 'Submit report' };

function insertEvent(db, vault) {
  const markdown = formatSessionEvent(event);
  db.prepare(`INSERT INTO log_events(id,event_type,occurred_at,timezone_offset,source_app,entity_id,markdown_payload,destination_path,delivery_state,last_error) VALUES(?,?,?,?,?,?,?,?, 'Pending',NULL)`).run(event.id, event.eventType, event.occurredAt, event.timezoneOffset, event.sourceApp, event.sessionId, markdown, vault);
  return markdown;
}

describe('focus event delivery', () => {
  it('formats and appends a duplicate-safe Focus record', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studyvault-focus-event-')); roots.push(root);
    const vault = path.join(root, 'vault'); const db = openDatabase(path.join(root, 'db.sqlite'));
    expect(insertEvent(db, vault)).toContain('actual_seconds: 1438');
    expect(deliverEvent(db, event.id)).toEqual({ state: 'Written', duplicate: false });
    db.prepare("UPDATE log_events SET delivery_state='Pending' WHERE id=?").run(event.id);
    expect(deliverEvent(db, event.id)).toEqual({ state: 'Written', duplicate: true });
    const file = path.join(vault, 'StudyVault Logs', 'Focus', '2026-09', '2026-09-26.md');
    expect(fs.readFileSync(file, 'utf8').match(/event_id: evt-focus-1/g)).toHaveLength(1);
    db.close();
  });

  it('keeps failed events available for Retry All', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studyvault-focus-fail-')); roots.push(root);
    const invalidVault = path.join(root, 'file'); fs.writeFileSync(invalidVault, 'not a folder');
    const db = openDatabase(path.join(root, 'db.sqlite')); insertEvent(db, invalidVault);
    expect(() => deliverEvent(db, event.id)).toThrow();
    expect(retryAllEvents(db)).toEqual({ written: 0, failed: 1 });
    expect(db.prepare('SELECT delivery_state FROM log_events WHERE id=?').get(event.id).delivery_state).toBe('Failed');
    db.close();
  });
});
