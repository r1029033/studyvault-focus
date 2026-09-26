import { randomUUID } from 'node:crypto';
import { calculateActiveSeconds } from './timer-calculation.js';
import { deliverEvent, formatSessionEvent } from './event-service.js';

function offsetString(date) {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

export function createSessionService(db, { now = () => new Date() } = {}) {
  const getVault = () => db.prepare("SELECT value FROM settings WHERE key='vault_path'").get()?.value;
  const getSession = (id) => db.prepare('SELECT * FROM sessions WHERE id=?').get(id);

  function addEvent({ eventType, session, occurredAt }) {
    const id = randomUUID();
    const event = {
      id, eventType, occurredAt, timezoneOffset: offsetString(new Date(occurredAt)), sourceApp: 'StudyVault Focus',
      sessionId: session.id, sessionType: session.type, status: session.outcome,
      plannedSeconds: session.planned_seconds, actualSeconds: session.actual_seconds,
      contextSnapshot: session.context_snapshot,
    };
    db.prepare(`INSERT INTO log_events
      (id,event_type,occurred_at,timezone_offset,source_app,entity_id,markdown_payload,destination_path,delivery_state,last_error)
      VALUES (?,?,?,?,?,?,?,?, 'Pending', NULL)`)
      .run(id, eventType, occurredAt, event.timezoneOffset, event.sourceApp, session.id, formatSessionEvent(event), getVault());
    return id;
  }

  function tryDelivery(eventId) {
    try { deliverEvent(db, eventId); } catch { /* The database record remains Failed for explicit Retry All. */ }
  }

  function startSession(input) {
    if (!['Focus', 'Break'].includes(input.type)) throw new Error('Session type must be Focus or Break');
    if (!Number.isInteger(input.plannedSeconds) || input.plannedSeconds <= 0) throw new Error('Duration must be a positive whole number of seconds');
    if (currentSession()) throw new Error('A session is already active');
    let taskId = null; let snapshot = null;
    if (input.type === 'Focus') {
      if (input.taskId) {
        const task = db.prepare("SELECT id,title FROM tasks WHERE id=? AND status='Active'").get(input.taskId);
        if (!task) throw new Error('Choose an active task');
        taskId = task.id; snapshot = task.title;
      } else if (input.description?.trim()) snapshot = input.description.trim();
      else throw new Error('Choose an active task or enter an activity');
    }
    const id = randomUUID();
    const occurredAt = now().toISOString();
    let eventId;
    db.transaction(() => {
      db.prepare(`INSERT INTO sessions
        (id,type,planned_seconds,actual_seconds,started_at,finished_at,outcome,task_id,context_snapshot)
        VALUES (?,?,?,NULL,?,NULL,'Running',?,?)`)
        .run(id, input.type, input.plannedSeconds, occurredAt, taskId, snapshot);
      eventId = addEvent({ eventType: 'session.started', session: getSession(id), occurredAt });
    })();
    tryDelivery(eventId);
    return getSession(id);
  }

  function pauseSession(id) {
    const session = getSession(id);
    if (!session || session.outcome !== 'Running') throw new Error('Only a running session can be paused');
    const occurredAt = now().toISOString();
    db.transaction(() => {
      db.prepare("UPDATE sessions SET outcome='Paused' WHERE id=?").run(id);
      db.prepare('INSERT INTO session_pauses(id,session_id,paused_at,resumed_at) VALUES(?,?,?,NULL)').run(randomUUID(), id, occurredAt);
    })();
    return getSession(id);
  }

  function resumeSession(id) {
    const session = getSession(id);
    if (!session || session.outcome !== 'Paused') throw new Error('Only a paused session can be resumed');
    const occurredAt = now().toISOString();
    db.transaction(() => {
      db.prepare("UPDATE sessions SET outcome='Running' WHERE id=?").run(id);
      db.prepare('UPDATE session_pauses SET resumed_at=? WHERE session_id=? AND resumed_at IS NULL').run(occurredAt, id);
    })();
    return getSession(id);
  }

  function finishSession(id, outcome) {
    if (!['Completed', 'Cancelled'].includes(outcome)) throw new Error('Outcome must be Completed or Cancelled');
    const session = getSession(id);
    if (!session) throw new Error('Session not found');
    if (['Completed', 'Cancelled'].includes(session.outcome)) return session;
    if (!['Running', 'Paused'].includes(session.outcome)) throw new Error('Session is not active');
    const occurredAt = now().toISOString();
    const pauses = db.prepare('SELECT paused_at AS pausedAt,resumed_at AS resumedAt FROM session_pauses WHERE session_id=? ORDER BY paused_at').all(id);
    const actualSeconds = calculateActiveSeconds({ startedAt: session.started_at, finishedAt: occurredAt, pauses });
    let eventId;
    db.transaction(() => {
      db.prepare('UPDATE sessions SET actual_seconds=?,finished_at=?,outcome=? WHERE id=?').run(actualSeconds, occurredAt, outcome, id);
      eventId = addEvent({ eventType: outcome === 'Completed' ? 'session.completed' : 'session.cancelled', session: getSession(id), occurredAt });
    })();
    tryDelivery(eventId);
    return getSession(id);
  }

  function currentSession() {
    return db.prepare("SELECT * FROM sessions WHERE outcome IN ('Running','Paused') ORDER BY started_at DESC LIMIT 1").get() || null;
  }

  function listHistory() {
    return db.prepare("SELECT * FROM sessions WHERE outcome IN ('Completed','Cancelled') ORDER BY started_at DESC").all();
  }

  function completeLinkedTask(sessionId) {
    const session = getSession(sessionId);
    if (!session?.task_id) return null;
    const task = db.prepare("SELECT * FROM tasks WHERE id=? AND status='Active'").get(session.task_id);
    if (!task) return null;
    const occurredAt = now().toISOString();
    let eventId;
    db.transaction(() => {
      db.prepare("UPDATE tasks SET status='Completed',completed_at=?,updated_at=? WHERE id=?").run(occurredAt, occurredAt, task.id);
      eventId = randomUUID();
      const markdown = `---\nevent_id: ${eventId}\ndate: ${occurredAt.slice(0, 10)}\ntime: ${occurredAt.slice(11, 19)}\nevent_type: task.completed\nsource_app: StudyVault Focus\ntask_id: ${task.id}\ntitle: ${task.title.replace(/[\r\n]+/g, ' ')}\n---\n\n`;
      db.prepare(`INSERT INTO log_events
        (id,event_type,occurred_at,timezone_offset,source_app,entity_id,markdown_payload,destination_path,delivery_state,last_error)
        VALUES (?,?,?,?,?,?,?,?, 'Pending', NULL)`)
        .run(eventId, 'task.completed', occurredAt, offsetString(new Date(occurredAt)), 'StudyVault Focus', task.id, markdown, getVault());
    })();
    tryDelivery(eventId);
    return db.prepare('SELECT * FROM tasks WHERE id=?').get(task.id);
  }

  return { startSession, pauseSession, resumeSession, finishSession, currentSession, listHistory, completeLinkedTask };
}
