import fs from 'node:fs';
import path from 'node:path';

export function localDateTime(occurredAt, timezoneOffset) {
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(timezoneOffset || '+00:00');
  const minutes = match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
  const local = new Date(new Date(occurredAt).getTime() + minutes * 60000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 19) };
}
export function getEventLogPath(vaultPath, event) {
  const { date } = localDateTime(event.occurred_at, event.timezone_offset);
  const area = event.event_type.startsWith('task.') ? 'Tasks' : 'Focus';
  return path.join(vaultPath, 'StudyVault Logs', area, date.slice(0, 7), `${date}.md`);
}
export function appendEvent(vaultPath, event, markdown) {
  const filePath = getEventLogPath(vaultPath, event);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (existing.includes(`event_id: ${event.id}`)) return { duplicate: true, filePath };
  fs.appendFileSync(filePath, markdown, 'utf8');
  return { duplicate: false, filePath };
}
