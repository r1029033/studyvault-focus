import fs from 'node:fs';
import path from 'node:path';

export function getFocusLogPath(vaultPath, occurredAt) {
  const day = occurredAt.slice(0, 10);
  return path.join(vaultPath, 'StudyVault Logs', 'Focus', day.slice(0, 7), `${day}.md`);
}

export function appendEvent(vaultPath, occurredAt, eventId, markdown) {
  const filePath = getFocusLogPath(vaultPath, occurredAt);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (existing.includes(`event_id: ${eventId}`)) return { duplicate: true, filePath };
  fs.appendFileSync(filePath, markdown, 'utf8');
  return { duplicate: false, filePath };
}
