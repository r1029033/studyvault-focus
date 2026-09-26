# StudyVault Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the independent `studyvault-focus` Electron application, connect it to the shared StudyVault database, and verify accurate focus/break tracking plus append-only Obsidian session logs.

**Architecture:** A React renderer presents timer, history, and settings views through a narrow preload API. The Electron main process owns the shared SQLite connection, active-duration calculations, session lifecycle transactions, folder selection, Markdown delivery, and active-window close cancellation. The app reads active tasks created by StudyVault Tasks and stores a task-title snapshot with every linked session.

**Tech Stack:** Node.js 22, npm, Electron Forge Vite template, Electron, React, JavaScript/JSX, `better-sqlite3`, Vitest, React Testing Library, CSS.

**Spec:** `docs/superpowers/specs/2026-09-26-studyvault-design.md`

## Global Constraints

- Target Windows desktop and work without a network connection after dependencies are installed.
- Create a separate private GitHub repository named `studyvault-focus`.
- Use JavaScript and JSX, not TypeScript.
- Open `%LOCALAPPDATA%\StudyVault\studyvault.db`, the same database used by StudyVault Tasks.
- Copy the exact same idempotent `schema-v1.sql` used by `studyvault-tasks`.
- Keep Node.js, SQLite, and filesystem access out of the renderer; expose explicit preload methods only.
- Default Focus duration is 25 minutes and default Break duration is 5 minutes.
- Store actual duration as whole active seconds excluding every paused interval.
- Reaching zero must play one cue and wait for Complete; it must not automatically complete or start another session.
- Store a task-title or activity snapshot at session start.
- Save session data and a Pending event before attempting a vault append.
- Append records under `StudyVault Logs/Focus/YYYY-MM/YYYY-MM-DD.md` without truncating earlier content.
- Closing while Running or Paused requires confirmation and records Cancelled before exit.
- Keep code simple and comment decisions rather than obvious syntax.
- Do not add analytics, automatic cycles, system tray behavior, background music, themes, or installers before required checks pass.

## Review Focus

- Rapid double-clicks on Start or Complete must not create duplicate sessions or terminal events; Task 5 tests idempotent state transitions.
- Multiple pause/resume cycles and time spent paused must not increase actual active duration; Task 3 tests fixed clock sequences.
- A linked task renamed or deleted after session start must not alter history; Task 5 tests the stored snapshot.
- An invalid or unwritable vault must preserve the completed/cancelled session and mark the event Failed; Task 4 and Task 5 test this.
- Closing a Running or Paused window must either keep the session intact when cancelled by the user or persist cancellation before closing; Task 6 tests both branches.

---

## File Structure

```text
studyvault-focus/
├── docs/superpowers/specs/2026-09-26-studyvault-design.md
├── docs/superpowers/plans/2026-09-26-studyvault-focus.md
├── reference/
│   ├── studyvault-design-prototype.html
│   ├── studyvault-step-2-final-prd.md
│   └── 3IXD_Dev5_Assignment_1.pdf
├── src/
│   ├── index.html
│   ├── main.js
│   ├── preload.js
│   ├── renderer.jsx
│   ├── styles.css
│   ├── main/
│   │   ├── database.js
│   │   ├── event-service.js
│   │   ├── ipc.js
│   │   ├── paths.js
│   │   ├── session-service.js
│   │   ├── timer-calculation.js
│   │   └── vault-writer.js
│   └── renderer/
│       ├── App.jsx
│       ├── components/Sidebar.jsx
│       ├── components/TimerControls.jsx
│       ├── components/TimerDisplay.jsx
│       ├── views/HistoryView.jsx
│       ├── views/SettingsView.jsx
│       └── views/TimerView.jsx
├── tests/
│   ├── setup.js
│   ├── database-compatibility.test.js
│   ├── event-service.test.js
│   ├── focus-ui.test.jsx
│   ├── session-service.test.js
│   └── timer-calculation.test.js
├── schema-v1.sql
├── forge.config.js
├── vite.main.config.mjs
├── vite.preload.config.mjs
├── vite.renderer.config.mjs
├── vitest.config.mjs
├── package.json
└── README.md
```

## Task 1: Create the Focus Repository and Tested Electron/React Shell

**Files:**
- Create: entire `studyvault-focus` repository shell.
- Create: `src/renderer/App.jsx`
- Create: `src/renderer.jsx`
- Create: `tests/setup.js`
- Create: `tests/focus-ui.test.jsx`
- Create: `vitest.config.mjs`
- Copy: approved spec, Focus plan, and supplied reference artifacts.

**Interfaces:**
- Consumes: GitHub authentication and the approved design/specification.
- Produces: independent `npm start`, `npm test`, and `npm run package` commands for StudyVault Focus.

- [ ] **Step 1: Create and clone the second private repository**

Run from `C:/Users/herma`:

```bash
mkdir -p 'C:/Users/herma/studyvault-focus'
gh repo create studyvault-focus --private
```

Initialize it with `main`:

```bash
cd 'C:/Users/herma/studyvault-focus'
git init -b main
git remote add origin https://github.com/r1029033/studyvault-focus.git
```

- [ ] **Step 2: Generate and install the Forge Vite shell**

Run:

```bash
rm -rf "$TMPDIR/studyvault-focus-scaffold"
NODE_INSTALLER=npm npx create-electron-app@latest "$TMPDIR/studyvault-focus-scaffold" --template=vite
cp -R "$TMPDIR/studyvault-focus-scaffold"/. .
npm pkg set name=studyvault-focus productName="StudyVault Focus"
npm install react react-dom better-sqlite3
npm install --save-dev @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Write the failing shell test**

Create `tests/focus-ui.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/renderer/App.jsx';

describe('StudyVault Focus shell', () => {
  it('shows timer modes and navigation', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Focus timer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Focus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Break' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Configure Vitest and verify the test fails**

Create `tests/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
```

Create `vitest.config.mjs`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    clearMocks: true,
  },
});
```

Then run:

```bash
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest"
npm test -- tests/focus-ui.test.jsx
```

Expected: FAIL because the Focus React shell does not exist.

- [ ] **Step 5: Implement the minimal shell**

Create `src/renderer/App.jsx`:

```jsx
export default function App() {
  return (
    <div className="app-shell">
      <aside>
        <strong>StudyVault Focus</strong>
        <button type="button">Timer</button>
        <button type="button">History</button>
        <button type="button">Settings</button>
      </aside>
      <main>
        <h1>Focus timer</h1>
        <button type="button">Focus</button>
        <button type="button">Break</button>
        <p>25:00</p>
      </main>
    </div>
  );
}
```

Create `src/renderer.jsx`, configure React in `vite.renderer.config.mjs`, and mount into `<div id="root"></div>`.

- [ ] **Step 6: Copy project artifacts, test, package, and commit**

Copy the approved spec, this plan, and the three supplied attachments into the repository. Run:

```bash
npm test -- tests/focus-ui.test.jsx
npm run package
git add .
git commit -m "chore: scaffold StudyVault Focus"
git push -u origin main
```

Expected: shell test PASS, package succeeds, and GitHub contains the initial commit.

## Task 2: Verify Shared Schema Compatibility and Active Task Reads

**Files:**
- Copy: `schema-v1.sql` from `studyvault-tasks`
- Create: `src/main/paths.js`
- Create: `src/main/database.js`
- Create: `tests/database-compatibility.test.js`

**Interfaces:**
- Consumes: schema and database API established in the Tasks repository.
- Produces: `openDatabase(databasePath) -> Database`, `listActiveTasks(db) -> TaskSummary[]`.

- [ ] **Step 1: Write a failing cross-app compatibility test**

Create a temporary database with the Focus copy of `schema-v1.sql`. Insert an active task using the Tasks column contract, open a second connection, and assert:

```js
expect(listActiveTasks(second)).toEqual([
  { id: 'task-1', title: 'Submit report', category: 'Design' },
]);
```

Also assert a Completed task is omitted and both handles report WAL mode.

- [ ] **Step 2: Verify the test fails**

Run:

```bash
npm test -- tests/database-compatibility.test.js
```

Expected: FAIL because database helpers do not exist.

- [ ] **Step 3: Copy the schema byte-for-byte and implement database opening**

Copy `schema-v1.sql` from `studyvault-tasks` without changing table or column names. Create `src/main/paths.js`:

```js
import path from 'node:path';

export function getDatabasePath(localAppDataPath) {
  return path.join(localAppDataPath, 'StudyVault', 'studyvault.db');
}
```

Create `src/main/database.js` with `fs.mkdirSync(path.dirname(databasePath), { recursive: true })`, `new Database(databasePath)`, `foreign_keys = ON`, `journal_mode = WAL`, `busy_timeout = 3000`, execution of `schema-v1.sql`, and an exact schema-version check for version `1`. Export `openDatabase` and the following query:

```js
export function listActiveTasks(db) {
  return db.prepare(`
    SELECT tasks.id, tasks.title, categories.name AS category
    FROM tasks
    JOIN categories ON categories.id = tasks.category_id
    WHERE tasks.status = 'Active'
    ORDER BY tasks.title COLLATE NOCASE
  `).all();
}
```

- [ ] **Step 4: Compare schema hashes and run tests**

Run from the parent folder:

```bash
sha256sum studyvault-tasks/schema-v1.sql studyvault-focus/schema-v1.sql
```

Expected: hashes match exactly.

Then run:

```bash
npm test -- tests/database-compatibility.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add schema-v1.sql src/main/paths.js src/main/database.js tests/database-compatibility.test.js
git commit -m "feat: connect Focus to shared data"
```

## Task 3: Pure Active-Time and Countdown Calculations

**Files:**
- Create: `src/main/timer-calculation.js`
- Create: `tests/timer-calculation.test.js`

**Interfaces:**
- Consumes: ISO timestamps or millisecond numbers.
- Produces: `calculateActiveSeconds({ startedAt, finishedAt, pauses }) -> number`, `calculateRemainingSeconds(plannedSeconds, activeSeconds) -> number`.

- [ ] **Step 1: Write failing calculation tests**

Create `tests/timer-calculation.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { calculateActiveSeconds, calculateRemainingSeconds } from '../src/main/timer-calculation.js';

describe('calculateActiveSeconds', () => {
  it('excludes multiple completed pause intervals', () => {
    expect(calculateActiveSeconds({
      startedAt: 0,
      finishedAt: 100_000,
      pauses: [
        { pausedAt: 10_000, resumedAt: 30_000 },
        { pausedAt: 50_000, resumedAt: 65_000 },
      ],
    })).toBe(65);
  });

  it('excludes an open pause through the finish time', () => {
    expect(calculateActiveSeconds({
      startedAt: 0,
      finishedAt: 40_000,
      pauses: [{ pausedAt: 15_000, resumedAt: null }],
    })).toBe(15);
  });

  it('rounds down to whole active seconds', () => {
    expect(calculateActiveSeconds({ startedAt: 0, finishedAt: 1_999, pauses: [] })).toBe(1);
  });
});

describe('calculateRemainingSeconds', () => {
  it('never returns a negative value', () => {
    expect(calculateRemainingSeconds(5, 9)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/timer-calculation.test.js
```

Expected: FAIL because the functions do not exist.

- [ ] **Step 3: Implement minimal pure calculations**

Create `src/main/timer-calculation.js`:

```js
export function calculateActiveSeconds({ startedAt, finishedAt, pauses }) {
  const totalMilliseconds = finishedAt - startedAt;
  const pausedMilliseconds = pauses.reduce((total, pause) => {
    const end = pause.resumedAt ?? finishedAt;
    return total + Math.max(0, end - pause.pausedAt);
  }, 0);

  return Math.max(0, Math.floor((totalMilliseconds - pausedMilliseconds) / 1000));
}

export function calculateRemainingSeconds(plannedSeconds, activeSeconds) {
  return Math.max(0, plannedSeconds - activeSeconds);
}
```

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/timer-calculation.test.js
git add src/main/timer-calculation.js tests/timer-calculation.test.js
git commit -m "feat: calculate active timer duration"
```

## Task 4: Focus Markdown Events and Retry Delivery

**Files:**
- Create: `src/main/vault-writer.js`
- Create: `src/main/event-service.js`
- Create: `tests/event-service.test.js`

**Interfaces:**
- Consumes: database log-event rows and configured vault path.
- Produces: `formatSessionEvent(event) -> string`, `deliverEvent(db, eventId)`, `retryAllEvents(db)`.

- [ ] **Step 1: Write failing session event tests**

Assert `session.started`, `session.completed`, and `session.cancelled` formatting includes event ID, date, time, timezone, event type, status, source app, session ID, type, planned seconds, actual seconds when terminal, and task/activity snapshot.

For a completed event:

```js
expect(formatSessionEvent({
  id: 'evt-focus-1',
  eventType: 'session.completed',
  occurredAt: '2026-09-26T11:00:00.000Z',
  timezoneOffset: '+02:00',
  sourceApp: 'StudyVault Focus',
  sessionId: 'session-1',
  sessionType: 'Focus',
  status: 'Completed',
  plannedSeconds: 1500,
  actualSeconds: 1438,
  contextSnapshot: 'Submit interaction design report',
})).toContain('actual_seconds: 1438');
```

Repeat append, failure, retry, and duplicate-ID tests using `StudyVault Logs/Focus/...`.

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
npm test -- tests/event-service.test.js
```

Expected: FAIL because Focus event services do not exist.

- [ ] **Step 3: Implement formatting and duplicate-safe delivery**

Use the same event-state behavior as StudyVault Tasks but route Focus records to:

```text
<vault>/StudyVault Logs/Focus/YYYY-MM/YYYY-MM-DD.md
```

Format one YAML-like Markdown block per event and end it with two newlines. Preserve snapshots as human-readable text. `retryAllEvents` processes Pending and Failed rows oldest-first and returns `{ written, failed }`.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/event-service.test.js
git add src/main/vault-writer.js src/main/event-service.js tests/event-service.test.js
git commit -m "feat: add append-only focus logging"
```

## Task 5: Session Lifecycle and Linked Task Completion

**Files:**
- Create: `src/main/session-service.js`
- Create: `tests/session-service.test.js`

**Interfaces:**
- Consumes: database handle, clock function, event delivery, and active-time calculations.
- Produces: `startSession(input)`, `pauseSession(id)`, `resumeSession(id)`, `finishSession(id, outcome)`, `listHistory()`, `completeLinkedTask(sessionId)`.

- [ ] **Step 1: Write failing lifecycle tests**

Test these sequences with an injected fixed clock:

1. Start Focus linked to `task-1`; assert Running session, title snapshot, and `session.started`.
2. Pause at 10 seconds, resume at 30 seconds, pause at 50 seconds, resume at 65 seconds, complete at 100 seconds; assert `actual_seconds = 65` and one `session.completed`.
3. Stop a Break at 12 seconds; assert Cancelled and one `session.cancelled`.
4. Rename and then delete the linked task after Start; assert history still shows the original snapshot.
5. Call Complete twice; assert the second call returns the existing terminal session and creates no second terminal event.
6. Complete a linked task; assert task status changes to Completed and one `task.completed` event is created.
7. Complete with an unwritable vault; assert the session persists and the event is Failed.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/session-service.test.js
```

Expected: FAIL because the session service does not exist.

- [ ] **Step 3: Implement validated state transitions**

Validate:

- type is `Focus` or `Break`;
- planned duration is a positive whole number of seconds;
- Focus has either an active task ID or nonblank description;
- Break ignores task/description input;
- Pause only accepts Running;
- Resume only accepts Paused;
- Complete/Cancel accept Running or Paused and are idempotent for an already-terminal session.

Store every pause interval in the shared `session_pauses` table defined by Task 2 of the Tasks plan. Pause inserts a row with `paused_at` and null `resumed_at`. Resume updates the current open row. Finishing while Paused leaves `resumed_at` null so `calculateActiveSeconds` uses the finish time as the interval end.

- [ ] **Step 4: Implement transactions and snapshots**

Start captures the selected task's current title or the trimmed activity description. Finish computes actual active seconds from stored timestamps and pauses, updates the session, and inserts the terminal event in one transaction. `completeLinkedTask` checks that the linked task remains Active, completes it, and inserts `task.completed` in one transaction.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- tests/session-service.test.js
npm test
git add schema-v1.sql src/main/session-service.js tests/session-service.test.js
git commit -m "feat: implement focus session lifecycle"
```

Expected: all tests PASS and schema hashes still match across repositories.

## Task 6: Secure IPC and Active-Session Window Close Handling

**Files:**
- Modify: `src/main.js`
- Modify: `src/preload.js`
- Create: `src/main/ipc.js`
- Create: `tests/window-close.test.js`

**Interfaces:**
- Consumes: session service, shared settings/event services, Electron dialog and BrowserWindow.
- Produces: explicit `window.studyVault.sessions`, `tasks`, `settings`, and `events` methods.

- [ ] **Step 1: Define the preload contract**

Expose:

```js
contextBridge.exposeInMainWorld('studyVault', {
  tasks: {
    listActive: () => ipcRenderer.invoke('tasks:list-active'),
  },
  sessions: {
    current: () => ipcRenderer.invoke('sessions:current'),
    start: (input) => ipcRenderer.invoke('sessions:start', input),
    pause: (id) => ipcRenderer.invoke('sessions:pause', id),
    resume: (id) => ipcRenderer.invoke('sessions:resume', id),
    complete: (id) => ipcRenderer.invoke('sessions:complete', id),
    cancel: (id) => ipcRenderer.invoke('sessions:cancel', id),
    history: () => ipcRenderer.invoke('sessions:history'),
    completeLinkedTask: (id) => ipcRenderer.invoke('sessions:complete-linked-task', id),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    chooseVault: () => ipcRenderer.invoke('settings:choose-vault'),
  },
  events: {
    retryAll: () => ipcRenderer.invoke('events:retry-all'),
  },
});
```

- [ ] **Step 2: Write failing close-decision tests around a pure handler**

Export `requestWindowClose({ currentSession, confirmClose, cancelSession })`. Test:

- no active session returns `true` without prompting;
- Running with user choosing Stay returns `false` without cancellation;
- Paused with user choosing Close calls `cancelSession` and returns `true` only after it resolves.

- [ ] **Step 3: Implement IPC and close handling**

Register validated handlers returning `{ ok, data, error }`. On BrowserWindow `close`, prevent default for Running or Paused sessions, show a warning dialog, and invoke the tested close-decision helper. Use a `closeApproved` flag so the second close after persisted cancellation exits without another prompt.

- [ ] **Step 4: Run checks and commit**

```bash
npm test -- tests/window-close.test.js
npm test
npm run package
git add src/main.js src/preload.js src/main/ipc.js tests/window-close.test.js
git commit -m "feat: expose secure focus APIs"
```

## Task 7: Timer, History, and Settings Interface

**Files:**
- Modify: `src/renderer/App.jsx`
- Create: `src/renderer/components/Sidebar.jsx`
- Create: `src/renderer/components/TimerControls.jsx`
- Create: `src/renderer/components/TimerDisplay.jsx`
- Create: `src/renderer/views/TimerView.jsx`
- Create: `src/renderer/views/HistoryView.jsx`
- Create: `src/renderer/views/SettingsView.jsx`
- Modify: `src/styles.css`
- Modify: `tests/focus-ui.test.jsx`

**Interfaces:**
- Consumes: the Focus preload API.
- Produces: all required timer, history, linked-task, and settings workflows.

- [ ] **Step 1: Write failing UI flow tests**

Mock `window.studyVault` and test:

- no vault displays setup and disables Start;
- Focus defaults to 25 minutes and Break to 5;
- changing mode updates the default duration;
- Focus requires a task or description;
- Start locks mode, task, description, and duration fields;
- Running shows Pause, Stop, and Complete;
- Paused shows Resume, Stop, and Complete;
- zero shows `Time's up` and Complete but does not call completion automatically;
- Stop calls cancellation and History displays Cancelled;
- Complete on a linked session opens `Is this task finished?` and Yes calls `completeLinkedTask`;
- History shows planned and actual duration;
- Failed event delivery shows a persistent warning;
- active tasks refresh on window focus and the 1000-millisecond poll.

- [ ] **Step 2: Run UI tests to verify they fail**

Run:

```bash
npm test -- tests/focus-ui.test.jsx
```

Expected: FAIL because the shell does not implement timer flows.

- [ ] **Step 3: Implement renderer state from persisted session data**

The renderer does not calculate final actual duration. It requests current session data from the main process and uses `startedAt`, pause state, and current time only to display an approximate countdown. On Complete or Stop it displays values returned by the service.

Use a one-second interval only while Running, clear it on pause/unmount, and never dispatch Complete when remaining reaches zero. Play one short Web Audio cue when the displayed remaining value first becomes zero.

- [ ] **Step 4: Implement accessible controls and prompts**

Use labeled inputs and real buttons. Keep mode/duration/context fields disabled while Running or Paused. Use a dialog for the linked-task completion question. Show errors near the relevant field and preserve user input after validation failures.

- [ ] **Step 5: Apply the supplied visual system**

Port the prototype's paper, green accent, timer ring, quiet two-column layout, sidebar, history table, settings cards, keyboard focus, and reduced-motion rule. At narrow widths, stack the timer stage and session panel.

- [ ] **Step 6: Run tests and manual flows**

Run:

```bash
npm test
npm start
```

With StudyVault Tasks also running, create a task there and verify it appears in Focus. Start, pause, resume, and complete a short Focus session. Start and stop a Break. Restart Focus and verify both records remain in History.

- [ ] **Step 7: Commit**

```bash
git add src/renderer src/styles.css tests/focus-ui.test.jsx
git commit -m "feat: build focus timer interface"
```

## Task 8: README, Real Log Sample, Cross-App and Clean-Clone Verification

**Files:**
- Modify: `README.md`
- Create after UI generation: `reference/generated-samples/StudyVault-Focus-sample.md`

**Interfaces:**
- Consumes: complete Focus application and verified Tasks application.
- Produces: reproducible setup instructions and final cross-app assignment evidence.

- [ ] **Step 1: Write README instructions**

Document prerequisites, install/run/test/package commands, dependencies, shared database path, vault selection, Focus and Break workflows, timer semantics, history, task linking, close cancellation, offline behavior, and manual acceptance steps.

- [ ] **Step 2: Run the complete suite and package check**

```bash
npm test
npm run package
```

Expected: zero failing tests and successful packaging.

- [ ] **Step 3: Run both apps against one temporary vault**

Create a task in Tasks. Select it in Focus. Start, pause, resume, and complete a short session. Choose Yes when asked whether the task is finished. Verify within approximately one second that Tasks moves it to Completed. Start and Stop a Break. Disconnect the network and repeat one task and one Focus flow.

- [ ] **Step 4: Generate and verify real Focus Markdown**

Copy the daily Focus Markdown generated by the UI into `reference/generated-samples/StudyVault-Focus-sample.md`. Verify it contains `session.started`, `session.completed`, and `session.cancelled`, plus planned and actual durations and task/activity snapshots. Confirm earlier entries remain unchanged after later events.

- [ ] **Step 5: Verify a clean clone**

Run:

```bash
rm -rf "$TMPDIR/studyvault-focus-clean"
gh repo clone r1029033/studyvault-focus "$TMPDIR/studyvault-focus-clean"
cd "$TMPDIR/studyvault-focus-clean"
npm install
npm test
npm run package
```

Expected: installation, tests, and packaging succeed without files from the original working tree.

- [ ] **Step 6: Commit, push, and verify GitHub**

```bash
git add README.md reference/generated-samples/StudyVault-Focus-sample.md
git commit -m "docs: verify StudyVault Focus delivery"
git push
gh repo view r1029033/studyvault-focus --json nameWithOwner,url,defaultBranchRef
```

Expected: GitHub reports `main` as the default branch and the final commits are visible.
