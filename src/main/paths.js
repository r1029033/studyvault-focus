import path from 'node:path';

export function getDatabasePath(localAppDataPath) {
  return path.join(localAppDataPath, 'StudyVault', 'studyvault.db');
}
