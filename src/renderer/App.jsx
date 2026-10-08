import { useCallback, useEffect, useRef, useState } from 'react';
import appIcon from '../assets/studyvault-focus-icon.png';
import knittingBunny from '../assets/knitting-bunny.png';
import redBeanie from '../assets/red-beanie.png';
import orangeScarf from '../assets/orange-scarf.png';
import blueFloralCardigan from '../assets/blue-floral-cardigan.png';

// Store session lengths in seconds (the unit used by the session service).
// These are the only selectable Focus lengths, and each one has its own knit.
const FOCUS_DURATIONS = [
  { seconds: 25 * 60, minutes: 25, garment: 'red beanie', article: 'a', image: redBeanie },
  { seconds: 35 * 60, minutes: 35, garment: 'orange scarf', article: 'an', image: orangeScarf },
  { seconds: 45 * 60, minutes: 45, garment: 'blue floral cardigan', article: 'a', image: blueFloralCardigan },
];
const DEFAULT_SECONDS = { Focus: FOCUS_DURATIONS[0].seconds, Break: 5 * 60 };
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function App() {
  const [view, setView] = useState('timer');
  const [mode, setMode] = useState('Focus');
  const [duration, setDuration] = useState(DEFAULT_SECONDS.Focus);
  const [taskId, setTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState([]);
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(DEFAULT_SECONDS.Focus);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({ vaultPath: null, failedEvents: 0 });
  const [error, setError] = useState('');
  const [finishedSession, setFinishedSession] = useState(null);
  const cued = useRef(false);

  const refresh = useCallback(async () => {
    const [settingsResult, taskResult, currentResult, historyResult] = await Promise.all([
      window.studyVault.settings.get(), window.studyVault.tasks.listActive(),
      window.studyVault.sessions.current(), window.studyVault.sessions.history(),
    ]);
    if (settingsResult.ok) setSettings(settingsResult.data);
    if (taskResult.ok) setTasks(taskResult.data);
    if (historyResult.ok) setHistory(historyResult.data);
    if (currentResult.ok && currentResult.data) {
      setSession(currentResult.data);
      setMode(currentResult.data.type);
      setDuration(currentResult.data.planned_seconds);
      setRemaining(currentResult.data.remaining_seconds ?? currentResult.data.planned_seconds);
    } else if (currentResult.ok) {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(poll); window.removeEventListener('focus', refresh); };
  }, [refresh]);

  useEffect(() => {
    if (remaining !== 0 || cued.current || session?.outcome !== 'Running') return;
    cued.current = true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const context = new AudioContext(); const oscillator = context.createOscillator();
        oscillator.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.15);
      }
    } catch { /* Audio is helpful but must never block completion. */ }
  }, [remaining, session?.outcome]);

  function changeMode(nextMode) {
    if (session) return;
    setMode(nextMode); setDuration(DEFAULT_SECONDS[nextMode]); setRemaining(DEFAULT_SECONDS[nextMode]); setError('');
  }

  async function chooseVault() {
    const result = await window.studyVault.settings.chooseVault();
    if (result.ok && result.data) { setSettings(result.data); setError(''); }
    else if (!result.ok) setError(result.error);
  }

  async function start() {
    if (mode === 'Focus' && !taskId && !description.trim()) return setError('Choose an active task or enter an activity');
    const result = await window.studyVault.sessions.start({ type: mode, plannedSeconds: duration, taskId: taskId || null, description });
    if (!result.ok) return setError(result.error);
    cued.current = false; setSession(result.data); setRemaining(duration); setError('');
  }

  async function act(name) {
    const result = await window.studyVault.sessions[name](session.id);
    if (!result.ok) return setError(result.error);
    setSession(result.data); setError('');
  }

  async function finish(outcome) {
    const method = outcome === 'Completed' ? 'complete' : 'cancel';
    const result = await window.studyVault.sessions[method](session.id);
    if (!result.ok) return setError(result.error);
    if (outcome === 'Completed' && result.data.task_id) setFinishedSession(result.data);
    setSession(null); setMode('Focus'); setDuration(DEFAULT_SECONDS.Focus); setRemaining(DEFAULT_SECONDS.Focus);
    await refresh();
  }

  const locked = Boolean(session);
  // Derive the buddy's project from the selected Focus length so the timer
  // and garment choice can never drift out of sync.
  const selectedKnit = FOCUS_DURATIONS.find((option) => option.seconds === duration) || FOCUS_DURATIONS[0];
  // Remaining time is supplied by the same session state as the timer, so
  // paused sessions hold their progress and a finished session reaches 100%.
  const knitProgress = session && mode === 'Focus'
    ? Math.min(1, Math.max(0, 1 - remaining / duration))
    : 0;
  // Only animate while actively counting down; a paused session keeps its
  // partially knitted item on screen without moving.
  const isKnitting = session?.outcome === 'Running' && mode === 'Focus' && remaining > 0;
  // Requiring a session avoids showing a "finished" item on the idle timer.
  const knitFinished = mode === 'Focus' && remaining === 0 && Boolean(session);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        {/* The app mark stays visible on every main view: Timer, History, and Settings. */}
        <div className="app-brand">
          <img className="app-icon" src={appIcon} alt="StudyVault Focus icon" />
          <div><span className="eyebrow">StudyVault</span><h2>Focus</h2></div>
        </div>
        <nav>{['timer', 'history', 'settings'].map((name) => <button key={name} className={view === name ? 'active' : ''} onClick={() => setView(name)}>{name[0].toUpperCase() + name.slice(1)}</button>)}</nav>
        <p className="vault-state">{settings.vaultPath ? '● Vault connected' : '○ Vault not selected'}</p>
      </aside>
      <main>
        <header><div><span className="eyebrow">Focused schoolwork</span><h1>{view === 'timer' ? 'Focus timer' : view[0].toUpperCase() + view.slice(1)}</h1></div></header>
        {error && <p className="error" role="alert">{error}</p>}
        {settings.failedEvents > 0 && <p className="error">Some Obsidian records failed. Open Settings and use Retry All.</p>}
        {view === 'timer' && <section className="timer-layout">
          <div className="timer-stage">
            <div className="mode-switch"><button disabled={locked} className={mode === 'Focus' ? 'active' : ''} onClick={() => changeMode('Focus')}>Focus</button><button disabled={locked} className={mode === 'Break' ? 'active' : ''} onClick={() => changeMode('Break')}>Break</button></div>
            <div className="timer-clock-row">
              <div className="timer-ring"><strong>{formatTime(remaining)}</strong><span>{remaining === 0 ? "Time's up" : session?.outcome || 'Ready'}</span></div>
              <section className="study-buddy" aria-label="Study buddy">
                <h3>Study buddy</h3>
                <div className={`buddy-avatar${isKnitting ? ' knitting' : ''}${knitFinished ? ' finished' : ''}`} aria-hidden="true">
                  <img className="buddy-character" src={knittingBunny} alt="" />
                  {mode === 'Focus' && !knitFinished && (
                    <div className="knitting-work">
                      {/* Each paw has its own needle and animation, so they cross like real knitting. */}
                      <span className="knitting-paw knitting-paw-left" />
                      <span className="knitting-paw knitting-paw-right" />
                      {/* The selected garment grows from 40% to full size with timer progress. */}
                      <img className="buddy-knit-in-progress" src={selectedKnit.image} alt="" style={{ transform: `translateX(-50%) scale(${0.4 + knitProgress * 0.6})`, opacity: Math.max(0.2, knitProgress) }} />
                    </div>
                  )}
                  {knitFinished && <img className="finished-knit" src={selectedKnit.image} alt="" />}
                </div>
                {mode === 'Break' ? (
                  <p className="buddy-status">Taking a break with you.</p>
                ) : knitFinished ? (
                  <p className="buddy-status">Finished! Your {selectedKnit.garment} is ready.</p>
                ) : (
                  <>
                    <p className="buddy-status">{isKnitting ? `Knitting ${selectedKnit.article} ${selectedKnit.garment}…` : `Ready to knit ${selectedKnit.article} ${selectedKnit.garment}.`}</p>
                    <div className="knit-progress" role="progressbar" aria-label={`${selectedKnit.garment} knitting progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(knitProgress * 100)}>
                      <span style={{ width: `${knitProgress * 100}%` }} />
                    </div>
                    <span className="knit-progress-label">{Math.round(knitProgress * 100)}% knitted</span>
                  </>
                )}
              </section>
            </div>
            <div className="timer-actions">
              {!session && <button className="primary" disabled={!settings.vaultPath} onClick={start}>Start {mode.toLowerCase()}</button>}
              {session?.outcome === 'Running' && <button onClick={() => act('pause')}>Pause</button>}
              {session?.outcome === 'Paused' && <button onClick={() => act('resume')}>Resume</button>}
              {session && <><button onClick={() => finish('Cancelled')}>Stop</button><button className="primary" onClick={() => finish('Completed')}>Complete</button></>}
            </div>
          </div>
          <div className="session-panel">
            <h3>Session details</h3>
            {mode === 'Focus' ? (
              <>
                {/* Keep option values in seconds for the session service and progress calculation. */}
              <label>Duration (minutes)<select value={duration} disabled={locked} onChange={(event) => { const seconds = Number(event.target.value); setDuration(seconds); setRemaining(seconds); }}>
                {FOCUS_DURATIONS.map((option) => <option key={option.seconds} value={option.seconds}>{option.minutes} minutes — {option.garment}</option>)}
              </select></label>
              </>
            ) : (
              <label>Duration (minutes)<input type="number" value={Math.round(duration / 60)} disabled readOnly /></label>
            )}
            {mode === 'Focus' && <><label>Active task<select value={taskId} disabled={locked} onChange={(event) => setTaskId(event.target.value)}><option value="">No linked task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><label>Or activity<input disabled={locked} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Review notes" /></label></>}
            {!settings.vaultPath && <div className="notice"><p>Select a writable Obsidian vault before starting.</p><button onClick={chooseVault}>Choose vault</button></div>}
          </div>
        </section>}
        {view === 'history' && <section className="history"><table><thead><tr><th>Started</th><th>Type</th><th>Context</th><th>Planned</th><th>Actual</th><th>Outcome</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td>{new Date(item.started_at).toLocaleString()}</td><td>{item.type}</td><td>{item.context_snapshot || '—'}</td><td>{Math.round(item.planned_seconds / 60)} min</td><td>{item.actual_seconds ?? 0} sec</td><td>{item.outcome}</td></tr>)}</tbody></table>{history.length === 0 && <p className="empty">No finished sessions yet.</p>}</section>}
        {view === 'settings' && <div className="settings-grid"><section className="settings-card"><h3>Obsidian vault</h3><p>{settings.vaultPath || 'No vault selected'}</p><button onClick={chooseVault}>Change vault</button></section><section className="settings-card"><h3>Event delivery</h3><p>Failed events: {settings.failedEvents}</p><button onClick={async () => { const result = await window.studyVault.events.retryAll(); if (!result.ok) setError(result.error); else setError(`Retry finished: ${result.data.written} written, ${result.data.failed} failed.`); await refresh(); }}>Retry All</button></section></div>}
      </main>
      {finishedSession && <div className="overlay"><div className="dialog" role="dialog" aria-modal="true"><h2>Is this task finished?</h2><p>Mark the linked task complete in StudyVault Tasks?</p><div className="dialog-actions"><button onClick={() => setFinishedSession(null)}>No</button><button className="primary" onClick={async () => { await window.studyVault.sessions.completeLinkedTask(finishedSession.id); setFinishedSession(null); await refresh(); }}>Yes</button></div></div></div>}
    </div>
  );
}
