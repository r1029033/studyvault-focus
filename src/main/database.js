import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import schema from '../../schema-v1.sql?raw';

export function openDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 3000');
  const hasVersionTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_info'").get();
  if (hasVersionTable) {
    const versions = db.prepare('SELECT version FROM schema_info').all().map((row) => row.version);
    if (versions.some((version) => version !== 1)) {
      db.close();
      throw new Error(`Unsupported StudyVault schema version: ${versions.join(', ') || 'missing'}`);
    }
  }
  db.exec(schema);
  return db;
}

export function listActiveTasks(db) {
  return db.prepare(`SELECT tasks.id, tasks.title, categories.name AS category
    FROM tasks JOIN categories ON categories.id=tasks.category_id
    WHERE tasks.status='Active' ORDER BY tasks.title COLLATE NOCASE`).all();
}
