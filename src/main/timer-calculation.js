export function calculateActiveSeconds({ startedAt, finishedAt, pauses }) {
  const start = new Date(startedAt).getTime();
  const finish = new Date(finishedAt).getTime();
  const pausedMilliseconds = pauses.reduce((total, pause) => {
    const pausedAt = new Date(pause.pausedAt).getTime();
    const resumedAt = pause.resumedAt == null ? finish : new Date(pause.resumedAt).getTime();
    return total + Math.max(0, resumedAt - pausedAt);
  }, 0);
  return Math.max(0, Math.floor((finish - start - pausedMilliseconds) / 1000));
}

export function calculateRemainingSeconds(plannedSeconds, activeSeconds) {
  return Math.max(0, plannedSeconds - activeSeconds);
}
