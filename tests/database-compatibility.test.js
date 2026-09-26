import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listActiveTasks, openDatabase } from '../src/main/database.js';

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe('shared database compatibility', () => {
  it('reads active tasks through a second WAL connection', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studyvault-compat-')); roots.push(root);
    const file = path.join(root, 'studyvault.db');
    const first = openDatabase(file); const second = openDatabase(file);
    first.prepare("INSERT INTO categories(id,name,created_at) VALUES('design','Design',?)").run(new Date(0).toISOString());
    const insert = first.prepare('INSERT INTO tasks(id,title,description,due_at,category_id,status,created_at,updated_at,completed_at) VALUES(?,?,NULL,NULL,?,?,?, ?,NULL)');
    insert.run('task-1', 'Submit report', 'design', 'Active', new Date(0).toISOString(), new Date(0).toISOString());
    insert.run('task-2', 'Old task', 'design', 'Completed', new Date(0).toISOString(), new Date(0).toISOString());
    expect(listActiveTasks(second)).toEqual([{ id: 'task-1', title: 'Submit report', category: 'Design' }]);
    expect(first.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(second.pragma('journal_mode', { simple: true })).toBe('wal');
    first.close(); second.close();
  });
});
