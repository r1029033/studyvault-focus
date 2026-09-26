import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../src/main/database.js';

const tempDirectories = [];
function newDatabasePath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyvault-db-'));
  tempDirectories.push(directory);
  return path.join(directory, 'studyvault.db');
}
afterEach(() => {
  for (const directory of tempDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('openDatabase', () => {
  it('creates every schema-v1 table and default category', () => {
    const db = openDatabase(newDatabasePath());
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
    expect(tables).toEqual(expect.arrayContaining(['schema_info', 'categories', 'tasks', 'sessions', 'session_pauses', 'settings', 'log_events']));
    expect(db.prepare('SELECT name FROM categories WHERE name = ?').get('Uncategorized')).toBeTruthy();
    db.close();
  });

  it('allows two WAL connections to read after a short write', () => {
    const databasePath = newDatabasePath();
    const first = openDatabase(databasePath);
    const second = openDatabase(databasePath);
    first.prepare('INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)').run('cat-test', 'Testing', '2026-09-26T10:00:00.000Z');
    expect(second.prepare('SELECT name FROM categories WHERE id = ?').get('cat-test').name).toBe('Testing');
    expect(first.pragma('journal_mode', { simple: true }).toLowerCase()).toBe('wal');
    first.close(); second.close();
  });
});
