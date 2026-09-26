# StudyVault Focus

StudyVault Focus is a small offline Windows desktop timer for focused schoolwork and breaks. It shares one local SQLite database with StudyVault Tasks and can append durable session records to an Obsidian vault.

## Prerequisites

- Node.js 22
- npm 10 or newer
- Windows 11 (the assignment target)
- An Obsidian vault or another writable folder for Markdown logs

## Install and run

```bash
npm install
npm start
```

Other useful commands:

```bash
npm test          # run the automated tests
npm run package   # build an unpacked desktop application
```

## How to use it

1. Open **Settings** and choose a writable Obsidian vault.
2. Choose **Focus** (25 minutes by default) or **Break** (5 minutes by default).
3. For Focus, select an active task from StudyVault Tasks or enter a short activity description.
4. Start, pause, resume, stop, or complete the session.
5. When a linked Focus session is completed, choose whether the linked task is also finished.
6. Open **History** to review completed and cancelled sessions.

Reaching `00:00` plays one short cue and displays **Time's up**. It does not complete the session automatically; press **Complete** yourself.

Closing the window while a session is Running or Paused asks for confirmation. Confirmed closing stores the session as Cancelled before the window exits.

## Shared data

Both StudyVault applications use:

```text
%LOCALAPPDATA%\StudyVault\studyvault.db
```

SQLite uses WAL mode and a 3000 ms busy timeout so both apps can use the database together. The renderer cannot access Node.js, SQLite, or the filesystem directly; it calls a small preload API owned by Electron's main process.

## Obsidian records

Session events are appended to:

```text
StudyVault Logs/Focus/YYYY-MM/YYYY-MM-DD.md
```

The database transaction is committed before the Markdown append is attempted. If writing fails, the session remains saved and its event is marked Failed. Select **Retry All** in Settings after fixing the vault path or permissions. Event IDs prevent duplicate blocks during retries.

## Offline behavior

After dependencies are installed, task reads, timer sessions, history, SQLite storage, and local Markdown logging work without a network connection. No account or cloud service is required.

## Manual acceptance checklist

- Select a vault and restart; the selection remains available.
- Create an active task in StudyVault Tasks and see it in Focus within about one second.
- Start, pause, resume, and complete a short Focus session.
- Verify paused time is excluded from the stored actual seconds.
- Mark a linked task complete and verify it moves to Completed in StudyVault Tasks.
- Start and stop a Break; verify History shows Cancelled.
- Make the vault unwritable, complete a session, then restore it and use Retry All.
- Close during Running and Paused states and verify both confirmation choices.

## Project structure

- `src/main/` — database, timer calculations, session lifecycle, event delivery, and IPC.
- `src/preload.js` — explicit renderer API.
- `src/renderer/` — React interface.
- `schema-v1.sql` — shared idempotent schema.
- `tests/` — database, event, timer, session, window-close, and UI tests.
- `reference/` — supplied assignment material and generated evidence.
