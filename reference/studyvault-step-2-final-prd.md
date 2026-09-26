# StudyVault — Final Step 2 Product Requirements Document

**Status:** Approved and scope-frozen after Grill session  
**Date:** September 25, 2026  
**Platform:** Windows desktop  
**Components:** StudyVault Tasks and StudyVault Focus  
**Submission deadline:** Monday evening, September 28, 2026  

## 1. Purpose

StudyVault is a two-app, offline desktop productivity system for personal schoolwork. StudyVault Tasks manages assignments, while StudyVault Focus records focused work and breaks. The apps share local task data, and both create clear, append-only Markdown activity records in a user-selected Obsidian vault.

## 2. Requirements traceability

| Assignment requirement | Product response | Verification |
|---|---|---|
| Desktop to-do and time-tracking tools | Two separately launchable Electron Forge apps | Run both from clean clones |
| Work offline | No account, cloud service, or required network call | Disconnect network and execute acceptance flows |
| Save data locally | Shared SQLite database in Local AppData | Restart both apps and inspect retained records |
| User-selected Obsidian vault | Shared first-run vault picker | Select a test vault from either app |
| Task CRUD | Create, view, edit, and delete tasks | Manual task workflow test |
| Complete and reopen tasks | Active/Completed status controls | Complete, reopen, and restart app |
| Required task logging | Creation, edit, completion, reopening, and deletion events | Inspect generated Task Markdown file |
| Focus controls | Start, pause, resume, stop/cancel, and complete | Manual session lifecycle test |
| Breaks and adjustable durations | One Focus type and one Break type with editable duration | Run custom-duration focus and break sessions |
| Task or description link | Select one active task or enter short text | Inspect local history and Markdown record |
| Review completed sessions | Focus History screen | Complete sessions and reopen app |
| Required session logging | Started, completed, and cancelled events | Inspect generated Focus Markdown file |
| Actual duration | Whole active seconds excluding paused intervals | Unit test plus timed manual test |
| Date, time, timezone, event, status, context | Required event schema | Inspect every generated event type |
| Predictable folders | Separate Task and Focus daily-log folders | Inspect selected vault structure |
| Append-only history | Append new entries; never truncate earlier records | Compare file contents before and after another event |
| Real generated records | Samples created through normal app UI flows | Submit copied test-vault output |
| Two separate apps | Two repositories | Verify repository links and READMEs |
| Clean-clone operation | Setup/run instructions and clone test | Follow each README on a fresh clone |

## 3. Intended user and problem

### User

One student managing personal school assignments on a Windows computer.

### Problem

A separate task manager and timer require duplicate data entry and make it easy to lose the relationship between an assignment and the time spent on it. The user also wants a local, readable activity history under their own control rather than an account-based cloud record.

StudyVault connects tasks and focus sessions while preserving both operational data and activity records locally.

## 4. Goals

- Deliver every assessed workflow before adding optional polish.
- Make school tasks quick to create, update, complete, and reopen.
- Start a focus session from an existing task without recreating its title.
- Preserve tasks and session history after the apps close.
- Generate understandable, app-created Obsidian records.
- Keep both repositories reproducible from clean clones.

## 5. Core required features

### 5.1 StudyVault Tasks

Each task contains:

- Stable local ID.
- Required title.
- Optional description.
- Optional manually entered due date and time.
- Exactly one category; `Uncategorized` is the default.
- Status: Active or Completed.
- Created and updated timestamps.
- Completed timestamp when applicable.

The user can:

- Create a task.
- View task details.
- Edit any supported task field.
- Delete a task after one confirmation prompt.
- Complete an active task.
- Reopen a completed task.
- Close and reopen the app without losing data.

Views:

- **Tasks:** all active tasks.
- **Today:** active tasks due today plus unfinished overdue tasks.
- **Completed:** completed tasks with a Reopen action.
- **Category filter:** filter tasks by their one assigned category.

Overdue tasks remain in Today and use both text/icon and color to communicate their state.

Required Task events:

- `task.created`
- `task.edited`
- `task.completed`
- `task.reopened`
- `task.deleted`

### 5.2 StudyVault Focus

Session types:

- **Focus:** default 25 minutes.
- **Break:** default 5 minutes.

The user can change the selected duration before starting.

Before starting a Focus session, the user can:

- Select one active shared task; or
- Enter a short activity description.

Break sessions do not require a task.

Controls:

- Start.
- Pause.
- Resume.
- Stop.
- Complete.

Behavior:

- Start creates a `session.started` event.
- Pause stops accumulating active time.
- Resume continues the same session.
- Stop ends the session as Cancelled and creates `session.cancelled`.
- Complete is available at any time and creates `session.completed`.
- Reaching zero plays one completion cue and waits for Complete; it does not start another session automatically.
- Actual duration is stored as whole active seconds and excludes every paused interval.
- Completed and cancelled sessions retain the task/activity text captured at session start.
- A renamed or deleted task does not make old session history unreadable.

After completing a Focus session linked to an active task, ask:

> Is this task finished?

- **Yes:** mark the task Completed in the shared database and create `task.completed`.
- **No:** leave the task Active.

### 5.3 Focus History

Show:

- Date and start time.
- Session type.
- Task-title snapshot or activity description.
- Planned duration.
- Actual active duration.
- Outcome: Completed or Cancelled.

Completed sessions satisfy the assignment’s review requirement. Cancelled sessions remain visible because they must be logged and are useful for verifying Stop behavior.

## 6. Custom features

### 6.1 Connected task-to-focus workflow

A task created in StudyVault Tasks is selectable in StudyVault Focus. Completing a linked focus session can also complete the task after explicit confirmation.

This is the primary product differentiator and the only cross-app feature that must be protected from scope cuts.

### 6.2 Human-readable Obsidian study ledger

The Obsidian integration is an append-only activity ledger rather than a database export. Task and Focus records remain readable and searchable without running either app.

## 7. Main user flows

### 7.1 First-run setup

1. Launch either app.
2. The app sees that no vault is configured.
3. Select a writable Obsidian vault with the Windows folder picker.
4. Save the path in the shared SQLite settings table.
5. The other app reuses the same setting.

Core record-producing actions stay disabled until a vault is selected, preventing accidental unlogged assessment data.

### 7.2 Create and complete a task

1. Create a task with title, optional details, due date/time, and category.
2. Save it to SQLite.
3. Generate and append `task.created`.
4. Complete the task.
5. Move it to Completed and append `task.completed`.
6. Reopen it if needed and append `task.reopened`.

### 7.3 Run a linked focus session

1. Select Focus.
2. Select an active task or type a description.
3. Set the duration.
4. Start, creating `session.started`.
5. Pause and resume if needed.
6. Press Complete before or at zero.
7. Save actual active seconds and append `session.completed`.
8. If linked to a task, answer whether the task is finished.

### 7.4 Cancel a session

1. Start a Focus or Break session.
2. Press Stop.
3. Store the outcome as Cancelled with actual active seconds.
4. Append `session.cancelled`.

### 7.5 Close during an active session

1. Attempt to close StudyVault Focus while Running or Paused.
2. Warn that closing will cancel the session.
3. If the user stays, continue the session.
4. If the user confirms closing, record Cancelled before exit.
5. Minimizing the window does not cancel the session.

### 7.6 Recover a failed vault write

1. Save the user action and event to SQLite.
2. Attempt the Markdown append immediately.
3. If it fails, mark the event Failed and show a clear error.
4. Keep the event locally after app restart.
5. The user selects **Retry All** after fixing the vault path or permissions.
6. Successful retries change the event state to Written.

Automatic background retry is not part of the MVP.

## 8. Data and integrations

### Operational source of truth

One SQLite database stored at a shared Windows location such as:

```text
%LOCALAPPDATA%\StudyVault\studyvault.db
```

Tables:

- `tasks`
- `categories`
- `sessions`
- `settings`
- `log_events`

`log_events` stores the event ID, type, timestamp, timezone, Markdown payload, destination, and state: Pending, Written, or Failed.

### Obsidian history

```text
<Selected Vault>/
└── StudyVault Logs/
    ├── Tasks/
    │   └── 2026-09/
    │       └── 2026-09-25.md
    └── Focus/
        └── 2026-09/
            └── 2026-09-25.md
```

Every record contains:

- Unique event ID.
- Date.
- Time.
- Timezone offset.
- Event type.
- Status.
- Source app.
- Relevant task or session ID.
- Relevant human-readable information.

Session completion and cancellation records also include planned duration, actual active duration, and linked task/activity.

### Synchronization

- Refresh shared task data whenever an app window gains focus.
- Poll the shared database approximately once per second while both apps are open.
- A task completed in StudyVault Focus must disappear from the active task selector and appear as Completed in StudyVault Tasks without manual refresh.

## 9. Technical decisions

### Framework

Use **Electron Forge, Vite, React, and JavaScript** for both apps.

This matches the developer's existing HTML, CSS, JavaScript, React, and basic Node.js knowledge. JavaScript is used instead of TypeScript to reduce new concepts and configuration work before the deadline. Vite provides the renderer development environment, React provides the interface, and Electron supplies the Windows application shell and Node.js access needed for SQLite, native folder selection, and Obsidian file writing.

Keep Electron-specific code deliberately small:

- The **renderer** contains the React interface and CSS.
- The **main process** owns windows, SQLite, native dialogs, and filesystem operations.
- The **preload script** exposes a narrow `window.studyVault` API to React.

The renderer must not receive unrestricted Node.js, database, or filesystem access.

### SQLite access

Use a Node-compatible SQLite driver in the Electron main process. Validate installation, reading, writing, WAL behavior, and packaged-path behavior in a small technical spike before implementing all screens.

Do not expose unrestricted database or filesystem access directly to the renderer. Use a narrow preload/API boundary for task, session, settings, and logging operations.

### Shared schema

Both repositories contain an identical, documented `schema-v1.sql`.

Each app:

- Opens the same Local AppData database.
- Enables appropriate SQLite concurrency settings.
- Runs only idempotent schema-v1 initialization.
- Rejects an unsupported future schema version rather than guessing.

### Timer calculation

Persist timestamps and accumulated paused duration. The visible countdown may update every second, but UI ticks are not the source of truth.

### Repository structure

- Repository 1: StudyVault Tasks.
- Repository 2: StudyVault Focus.
- Each repository contains its own source, tests, copied `schema-v1.sql`, README, and reference artifacts relevant to that app.
- Each project is created from an Electron Forge Vite starter and then configured with React.
- Application code uses JavaScript and JSX; TypeScript is not required for the MVP.

## 10. Screen layout and usability

### StudyVault Tasks

**Navigation**

- Tasks
- Today
- Completed
- Settings

**Main list**

- New Task button.
- Title.
- Category.
- Due date/time.
- Completion control.
- Edit and delete actions.

**Task form**

- Title.
- Description.
- Due date/time.
- Category.
- Save and Cancel.

### StudyVault Focus

**Timer screen**

- Focus/Break selector.
- Large remaining-time text.
- Active task selector or activity-description field.
- Duration input.
- Start, Pause/Resume, Stop, and Complete controls.

**History screen**

- Date.
- Session type.
- Task/activity.
- Planned and actual duration.
- Outcome.

**Settings**

- Current vault path.
- Change Vault.
- Failed-event count.
- Retry All.

### Usability decisions

- Keep the timer screen visually quiet.
- Use manual date/time inputs rather than natural-language parsing.
- Use one category per task to model school subjects.
- Require confirmation only for task deletion and active-session window closure.
- Use text/icon cues in addition to color.
- Make required controls keyboard reachable with visible focus states.
- Do not automatically change session types or start another timer.

## 11. Non-goals and stretch goals

### Non-goals

- Accounts and authentication.
- Cloud synchronization.
- Collaboration.
- Mobile or web versions.
- Calendar integration.
- Reminders.
- Natural-language date parsing.
- Recurring tasks.
- Subtasks.
- Multiple tasks per session.
- Detailed analytics.
- Background music, ambient audio, Discord integration, or themes.
- General Undo infrastructure.
- Automatic background retry service.

### Stretch goals

Attempt only after every required acceptance criterion passes:

- System-tray timer.
- Advanced sleep/restart recovery.
- Long-break type and Pomodoro cycle counting.
- Upcoming and richer category views.
- Packaged installers or portable builds.
- Visual themes or additional sounds.

## 12. Alternative considered

**Alternative:** One combined Electron app with Tasks and Focus sections.

**Why rejected:** It would reduce repository, database-concurrency, and synchronization complexity, making it safer for the deadline. It was rejected because the intended product is two separately launchable tools, and their shared-task connection is a deliberate custom feature.

The additional complexity is accepted but controlled through a shared schema, polling rather than custom IPC, and aggressive removal of optional features.

## 13. Testable acceptance criteria

### Tasks

- [ ] Creating a task through the UI stores it locally and appends `task.created`.
- [ ] After closing and reopening, the created task remains.
- [ ] Editing a task changes the visible fields and appends `task.edited`.
- [ ] Completing a task moves it out of active tasks and appends `task.completed`.
- [ ] Reopening a task returns it to active tasks and appends `task.reopened`.
- [ ] Confirming deletion removes the task from normal views and appends `task.deleted`.
- [ ] Today shows due-today and unfinished overdue tasks.

### Focus

- [ ] Start creates a Running session and `session.started`.
- [ ] Pause stops active-time accumulation.
- [ ] Resume continues the same session.
- [ ] Stop records Cancelled, actual active seconds, and `session.cancelled`.
- [ ] Complete records Completed, actual active seconds, and `session.completed`.
- [ ] Focus and Break durations can be changed before starting.
- [ ] A Focus session accepts either one active task or a short description.
- [ ] History shows completed sessions after closing and reopening.
- [ ] Deleting or renaming a task does not erase or corrupt old session descriptions.
- [ ] Completing a linked session can complete its task after confirmation.
- [ ] The completed task updates in StudyVault Tasks without manual refresh.

### Obsidian and offline operation

- [ ] First-run setup requires a writable user-selected vault.
- [ ] Both apps reuse the shared vault setting.
- [ ] Task records appear only under the predictable Task log hierarchy.
- [ ] Focus records appear only under the predictable Focus log hierarchy.
- [ ] Every event contains the required timestamp, timezone, type, status, ID, and context.
- [ ] Adding an event leaves all previous file content intact.
- [ ] A failed append leaves the user action saved and the event marked Failed in SQLite.
- [ ] Retry All writes the failed event after the vault becomes writable.
- [ ] Core task and timer workflows succeed with the network disconnected.
- [ ] Submitted Markdown samples are generated through actual UI actions.

### Testing and repositories

- [ ] Unit tests cover active-duration calculation across multiple pauses.
- [ ] Unit tests cover Markdown formatting for required Task and Session events.
- [ ] Both repositories include setup, run, dependency, and vault-configuration instructions.
- [ ] Both apps run successfully from clean clones by following their READMEs.
- [ ] Git history contains incremental commits.

## 14. Design artifacts

| Artifact | Covers | Decision it resolves |
|---|---|---|
| Task App wireframe | Tasks, Today, Completed, editor form | Which information must be visible without opening each task |
| Focus App state wireframe | Setup, Running, Paused, Completed, task-completion prompt | How required timer controls remain clear without clutter |
| System/data-flow diagram | Two apps, shared SQLite, failed-event storage, vault folders | Separation between live data and append-only history |

The visual direction itself is decided in Step 3. Decorative style work must not replace these functional artifacts.

## 15. Delivery checklist

- [ ] Research covers at least three task apps and three timer apps with sources.
- [ ] Both repositories exist and use incremental commits.
- [ ] Each README documents setup, running, dependencies, and vault selection.
- [ ] Both repositories pass clean-clone verification.
- [ ] Three meaningful design artifacts are saved in reference folders and included in the report.
- [ ] Task and Focus Markdown samples are generated by the real apps.
- [ ] The report includes research, PRD, design and technical decisions, visuals, AI note, and reflection.
- [ ] GitHub repository links are included.
- [ ] Final PDF and Obsidian sample use the assignment’s required naming format.

## 16. Grill outcome

The plan was explicitly challenged on architecture, deadline, framework, feature scope, vault failure handling, timer semantics, testing, linked-history behavior, and delivery format.

The user confirmed alignment and froze this specification on September 25, 2026. Step 2 is complete. Changes after this point should be limited to corrections required by technical validation or assignment compliance—not optional feature additions.
