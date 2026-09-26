import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { dialog, ipcMain } from 'electron';
import { listActiveTasks } from './database.js';
import { createSessionService } from './session-service.js';
import { retryAllEvents } from './event-service.js';

const wrap = (handler) => async (_event, input) => {
  try { return { ok: true, data: await handler(input) }; }
  catch (error) { return { ok: false, error: error.message }; }
};

export function registerIpc(db) {
  const sessions = createSessionService(db);
  ipcMain.handle('tasks:list-active', wrap(() => listActiveTasks(db)));
  ipcMain.handle('sessions:current', wrap(() => sessions.currentSession()));
  ipcMain.handle('sessions:start', wrap((input) => sessions.startSession(input)));
  ipcMain.handle('sessions:pause', wrap((id) => sessions.pauseSession(id)));
  ipcMain.handle('sessions:resume', wrap((id) => sessions.resumeSession(id)));
  ipcMain.handle('sessions:complete', wrap((id) => sessions.finishSession(id, 'Completed')));
  ipcMain.handle('sessions:cancel', wrap((id) => sessions.finishSession(id, 'Cancelled')));
  ipcMain.handle('sessions:history', wrap(() => sessions.listHistory()));
  ipcMain.handle('sessions:complete-linked-task', wrap((id) => sessions.completeLinkedTask(id)));
  ipcMain.handle('settings:get', wrap(() => ({
    vaultPath: db.prepare("SELECT value FROM settings WHERE key='vault_path'").get()?.value || null,
    failedEvents: db.prepare("SELECT count(*) count FROM log_events WHERE delivery_state='Failed'").get().count,
  })));
  ipcMain.handle('settings:choose-vault', wrap(async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled) return null;
    const vaultPath = result.filePaths[0];
    const probe = path.join(vaultPath, `.studyvault-write-test-${randomUUID()}`);
    let handle;
    try { handle = fs.openSync(probe, 'wx'); } finally { if (handle !== undefined) fs.closeSync(handle); if (fs.existsSync(probe)) fs.unlinkSync(probe); }
    db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run('vault_path', vaultPath);
    return { vaultPath, failedEvents: 0 };
  }));
  ipcMain.handle('events:retry-all', wrap(() => retryAllEvents(db)));
  return sessions;
}
