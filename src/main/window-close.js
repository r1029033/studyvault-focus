export async function requestWindowClose({ currentSession, confirmClose, cancelSession }) {
  if (!currentSession || !['Running', 'Paused'].includes(currentSession.outcome)) return true;
  if (!(await confirmClose())) return false;
  await cancelSession(currentSession.id);
  return true;
}
