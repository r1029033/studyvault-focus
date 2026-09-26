# StudyVault Tasks and Focus Design Specification

**Date:** September 26, 2026

**Status:** Approved conversational design

**Repositories:** `studyvault-tasks` and `studyvault-focus`

## 1. Purpose and scope

StudyVault is a local Windows productivity system made of two separately launchable desktop applications:

- **StudyVault Tasks** manages school assignments.
- **StudyVault Focus** runs focus and break timers and records completed or cancelled sessions.

The applications work offline, share task data through a local SQLite database, and write append-only Markdown activity records to a user-selected Obsidian vault. The implementation prioritizes the assignment's assessed workflows, understandable code, and clean-clone reproducibility. Optional features are excluded until every required acceptance flow works.

## 2. Repository strategy

The system uses two independent GitHub repositories:

1. `studyvault-tasks`
2. `studyvault-focus`

Each repository contains a complete Electron Forge, Vite, React, and JavaScript application with its own dependencies, tests, README, copied `schema-v1.sql`, and relevant reference artifacts.

The repositories intentionally duplicate a small amount of database initialization, event formatting, and vault-writing code. This avoids a third shared package and ensures that either repository can be cloned, installed, and run independently.

## 3. Technical architecture

Each application has three layers:

### Electron main process

The main process owns:

- Application windows and lifecycle.
- SQLite access and schema initialization.
- Native folder selection.
- Obsidian vault filesystem access.
- Task or session service operations.
- Log-event creation and retry behavior.
- Explicit IPC handlers.

### Preload script

The preload script exposes a narrow `window.studyVault` API. It provides only the methods needed by the React interface. The renderer does not receive unrestricted Node.js, SQLite, or filesystem access.

### React renderer

The renderer owns:

- Screens and navigation.
- Forms and client-side validation.
- Timer presentation and user controls.
- Loading, success, empty, and error states.

## 4. Shared data model

Both applications open the same database:

```text
%LOCALAPPDATA%\StudyVault\studyvault.db
```

The schema contains:

- `schema_info`
- `categories`
- `tasks`
- `sessions`
- `settings`
- `log_events`

Both repositories include the same documented `schema-v1.sql`. Initialization is idempotent. Each application enables SQLite WAL mode and a short busy timeout for concurrent access. An application rejects an unsupported future schema version instead of modifying it speculatively.

### Tasks

A task stores:

- Stable local ID.
- Required title.
- Optional description.
- Optional due date and time.
- Exactly one category, defaulting to `Uncategorized`.
- `Active` or `Completed` status.
- Created and updated timestamps.
- Optional completed timestamp.

### Sessions

A session stores:

- Stable local ID.
- `Focus` or `Break` type.
- Planned duration in seconds.
- Actual active duration in whole seconds.
- Start and finish timestamps.
- `Running`, `Completed`, or `Cancelled` outcome as applicable.
- Optional linked task ID.
- Task-title or activity-description snapshot captured at start.

The snapshot remains readable if the original task is renamed or deleted.

### Log events

A log event stores:

- Unique event ID.
- Event type.
- Timestamp and timezone offset.
- Source application.
- Relevant entity ID and human-readable context.
- Prepared Markdown payload.
- Destination path.
- `Pending`, `Written`, or `Failed` delivery state.

## 5. StudyVault Tasks components

StudyVault Tasks has four views:

### Tasks

Displays all active tasks, with category filtering and actions to create, view, edit, complete, or delete a task.

### Today

Displays active tasks due today and all unfinished overdue tasks. Overdue state uses text or an icon in addition to color.

### Completed

Displays completed tasks with a Reopen action.

### Settings

Displays the selected Obsidian vault path, failed-event count, Change Vault action, and Retry All action.

A single task form handles creation and editing. It contains title, description, due date, due time, and category fields. Task deletion requires one confirmation prompt.

Required task events are:

- `task.created`
- `task.edited`
- `task.completed`
- `task.reopened`
- `task.deleted`

## 6. StudyVault Focus components

StudyVault Focus has three views:

### Timer

Provides:

- Focus and Break modes.
- Default durations of 25 and 5 minutes.
- A positive whole-minute duration input before start.
- Active-task selection or a short activity description for Focus sessions.
- Start, Pause, Resume, Stop, and Complete controls.
- A large remaining-time display.
- Current-session summary.

Break sessions do not require task or activity context.

### History

Shows completed and cancelled sessions with date and start time, session type, task or activity snapshot, planned duration, actual active duration, and outcome.

### Settings

Uses the same shared vault configuration and failed-event retry behavior as StudyVault Tasks.

Required session events are:

- `session.started`
- `session.completed`
- `session.cancelled`

## 7. Timer state and duration calculation

The timer uses the following states:

```text
Idle -> Running -> Paused
           |          |
           +------> Completed or Cancelled
```

The visible countdown refreshes approximately once per second, but UI ticks are not the source of truth. The timer records timestamps and accumulated paused intervals. Actual duration is calculated as whole active seconds and excludes all paused time.

At zero, the application plays one completion cue, stops decrementing, and waits for the user to select Complete. It does not automatically begin a break or another focus session.

Completing a Focus session linked to an active task prompts, "Is this task finished?" Choosing Yes completes the shared task and creates `task.completed`; choosing No leaves it active.

Attempting to close the Focus window while Running or Paused shows a confirmation. Confirming records the session as Cancelled before exit. Minimizing does not cancel the session.

## 8. Data and event flow

Every record-producing action follows this order:

1. Validate the request in the main process.
2. Begin a SQLite transaction.
3. Save the operational task or session change.
4. Save a corresponding Pending log event with its Markdown payload.
5. Commit the transaction.
6. Attempt the Markdown append immediately.
7. Mark the event Written on success or Failed on error.
8. Return the saved data and delivery result to the renderer.

This ordering ensures a vault failure cannot discard the user's task or session data.

The writer creates missing monthly folders and daily files and opens files in append mode only. The event ID is included in every entry. Before retrying, the writer checks the destination for that event ID so a response interruption cannot create a duplicate entry.

Retry All processes Pending and Failed events and updates each state independently.

## 9. Obsidian vault structure

Both applications reuse a vault selected through the native Windows folder picker:

```text
<Selected Vault>/
└── StudyVault Logs/
    ├── Tasks/
    │   └── YYYY-MM/
    │       └── YYYY-MM-DD.md
    └── Focus/
        └── YYYY-MM/
            └── YYYY-MM-DD.md
```

Every record includes:

- Event ID.
- Date.
- Time.
- Timezone offset.
- Event type.
- Status.
- Source application.
- Relevant task or session ID.
- Human-readable context.

Session completion and cancellation records also contain planned duration, actual active duration, and the linked task or activity snapshot.

Core record-producing controls remain disabled until a writable vault has been selected. Both applications store and reuse the same vault setting.

## 10. Cross-application synchronization

Both applications refresh shared data when their window receives focus and poll the database approximately once per second while open.

StudyVault Focus refreshes the active-task selector. StudyVault Tasks refreshes its Active, Today, and Completed lists. A task completed from StudyVault Focus therefore moves to Completed in StudyVault Tasks without a manual refresh.

No custom network service or direct cross-window IPC is used. SQLite is the shared coordination point.

## 11. Interface design

The applications follow the supplied StudyVault prototype:

- Warm paper background.
- Dark green accent.
- Georgia-style display headings.
- Segoe UI body and control text.
- Left navigation sidebar.
- Rounded panels with restrained borders and shadows.
- Visible keyboard focus indicators.
- Text or icon cues in addition to color.
- Responsive behavior for smaller windows.

### Tasks layout

Task cards show completion control, title, category, due date/time, overdue or due-today state, edit, and delete. The design avoids hiding required actions behind hover-only controls.

### Focus layout

The timer uses a visually quiet two-column screen: countdown and controls on the left, session setup or summary on the right. The history view uses a simple readable table.

Prototype search is excluded from the required implementation because it is not an assignment or PRD requirement. It may be added only after all acceptance criteria pass.

## 12. Validation and error handling

### Tasks

- An empty title cannot be saved.
- Invalid or incomplete due values remain unset rather than being guessed.
- Database errors leave the form open and show a short readable message.
- Delete requires confirmation.

### Focus

- A Focus session requires either an active task or a short description.
- A Break session requires neither.
- Duration must be a positive whole number.
- Controls are enabled only for valid timer states.
- Session completion and cancellation operations are idempotent at the UI boundary.

### Vault and database errors

- Errors shown to the user do not expose raw stack traces.
- Failed Markdown writes preserve operational data and log-event payloads.
- Failed events remain available after application restart.
- Retry All reports how many events were written and how many still failed.

## 13. Code organization and comments

Code is separated by responsibility without introducing a complex framework.

Typical main-process modules are:

```text
database.js
schema.js
task-service.js
session-service.js
event-service.js
vault-writer.js
ipc.js
```

Renderer code uses small views and reusable controls only where reuse is clear. Comments explain non-obvious decisions, including:

- Shared SQLite location and WAL use.
- Preload security boundaries.
- Active-time calculation across pauses.
- Database-first event persistence.
- Task-title snapshots.
- Append-only and duplicate-safe retries.

Comments do not restate obvious JavaScript or JSX syntax.

## 14. Testing strategy

Vitest unit tests cover:

- Active duration across multiple pauses.
- Completion and cancellation duration calculation.
- Markdown formatting for every required task and session event.
- Today and overdue task selection.
- Task-title snapshots in session history.
- Event delivery state changes.

Service-level tests use a temporary SQLite database and temporary vault folder for:

- Task CRUD and status transitions.
- Session persistence.
- Append-only writes.
- Failed write retention and retry.
- Duplicate-event prevention.

Manual README checklists cover:

- First-run vault selection.
- Every required task action.
- Every required timer action.
- Custom focus and break durations.
- Linked task completion.
- Restart persistence.
- Running both apps together.
- Offline operation.
- Clean-clone installation and startup.

## 15. Repository contents and delivery

Each repository includes:

- Application source.
- Tests.
- `schema-v1.sql`.
- Relevant artifacts in `reference/`.
- README setup, run, dependency, vault-configuration, and manual-test instructions.
- Generated Obsidian examples only after they are produced through real application UI flows.

Git history uses incremental commits for setup, data services, interface features, tests, documentation, and verification.

## 16. Explicit non-goals

The initial implementation excludes:

- Accounts or authentication.
- Cloud synchronization.
- Collaboration.
- Mobile or web versions.
- Calendar integration and reminders.
- Natural-language dates.
- Recurring tasks and subtasks.
- Multiple tasks per session.
- Analytics.
- Automatic Pomodoro cycles.
- System-tray behavior.
- General undo infrastructure.
- Installers unless all required acceptance checks already pass.

## 17. Acceptance boundary

The implementation is complete only when both applications:

- Run from their independent repositories.
- Work without a network connection.
- Persist their required data after restart.
- Share tasks through the common local database.
- Generate the required append-only Obsidian records.
- Preserve failed events and retry them successfully.
- Pass automated tests.
- Pass the documented manual workflows.
- Can be installed and run from clean clones by following their READMEs.
