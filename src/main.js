import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { openDatabase } from './main/database.js';
import { getDatabasePath } from './main/paths.js';
import { registerIpc } from './main/ipc.js';
import { requestWindowClose } from './main/window-close.js';

if (started) app.quit();
let db; let sessions;

function createWindow() {
  const window = new BrowserWindow({
    width: 1120, height: 760, minWidth: 760, minHeight: 560,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  let closeApproved = false;
  window.on('close', (event) => {
    if (closeApproved) return;
    const currentSession = sessions.currentSession();
    if (!currentSession) return;
    event.preventDefault();
    requestWindowClose({
      currentSession,
      confirmClose: async () => (await dialog.showMessageBox(window, {
        type: 'warning', buttons: ['Stay', 'Close and cancel session'], defaultId: 0, cancelId: 0,
        title: 'Active session', message: 'Close StudyVault Focus and record this session as Cancelled?',
      })).response === 1,
      cancelSession: async (id) => sessions.finishSession(id, 'Cancelled'),
    }).then((shouldClose) => { if (shouldClose) { closeApproved = true; window.close(); } });
  });
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
}

app.whenReady().then(() => {
  db = openDatabase(getDatabasePath(process.env.LOCALAPPDATA || app.getPath('appData')));
  sessions = registerIpc(db);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('will-quit', () => db?.close());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
