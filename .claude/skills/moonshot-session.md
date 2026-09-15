---
name: Moonshot Session
description: Register this Claude session as a main working session so the moonshot reviewer and drift-watch sessions know it exists. Only runs when invoked. Usage /moonshot-session start <what I am working on> | stop | status | inbox
---

## Moonshot Session

You are a **main working session**. This skill registers you so the two side sessions
(`/moonshot-review`, `/moonshot-drift`) can find your transcript, know your task, and message you.
Unregistered sessions are invisible to them by design.

Registry: `moonshot/reviews/sessions.jsonl` (one JSON object per line, append only).
Inbox: `moonshot/reviews/inbox/<session-id>.md` (reviewers write questions here).

### `start <task>`
1. `SID=$CLAUDE_CODE_SESSION_ID`. Get your session **name** by calling `ListAgents` and reading the
   first line ("This session is <name> [<ref>]"). Transcript is
   `~/.claude/projects/-Users-shaurya-Desktop-dev-plattr-pro/$SID.jsonl`.
2. Append one line to the registry:
   `{"ts":"<ISO now>","event":"start","id":"<SID>","name":"<name>","task":"<task text>"}`
3. Create `moonshot/reviews/inbox/<SID>.md` if missing, with one heading line.
4. Read `moonshot/CLAUDE.md` and `moonshot/STATE.md` if you have not this session.
5. Reply in two lines: registered as <name>, working on <task>.

### While registered
- After finishing each task, and before saying "done", read your inbox file. Answer any question
  there by appending a reply under it, then carry on. Reviewers may also message you directly via
  SendMessage; treat those the same way.
- When your task changes materially, append a `{"event":"note",...,"task":"<new task>"}` line.

### `stop`
1. Append `{"ts":"<ISO now>","event":"stop","id":"<SID>"}`.
2. Prune: rewrite the registry keeping only lines newer than 7 days.
3. Update `moonshot/STATE.md` (In flight / Done / Next) for what this session did.
4. Reply in one line.

### `status`
Print the registry's active sessions (started, no matching stop) as `name · task · started`.

### `inbox`
Print your inbox file and answer anything unanswered.

Never edit another session's inbox. Never delete review files.
