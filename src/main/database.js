import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const schemaPath = path.resolve(process.cwd(), 'schema-v1.sql');

export function openDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 3000');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
  const version = db.prepare('SELECT version FROM schema_info LIMIT 1').get()?.version;
  if (version !== 1) {
    db.close();
    throw new Error(`Unsupported StudyVault schema version: ${version}`);
  }
  return db;
}

export function listActiveTasks(db) {
  return db.prepare(`
    SELECT tasks.id, tasks.title, categories.name AS category
    FROM tasks
    JOIN categories ON categories.id = tasks.category_id
    WHERE tasks.status = 'Active'
    ORDER BY tasks.title COLLATE NOCASE
  `).all();
}
