# Logging System Design

## 1. Goals
- One central logger replacing the scattered `console.log` (currently ~34 call sites).
- **Running log**: continuous runtime log written to a file (persists across restarts, survives crashes).
- **Log levels** like production systems (DEBUG / INFO / WARN / ERROR / FATAL) with a configurable minimum level.
- **Structured entries** (JSON line per event) so each line is machine-readable and greppable.
- **Colored console** output in dev — error lines in red (Todo #18), warnings yellow, info cyan.
- **Rotation** so the log file never grows unbounded.
- Lightweight, explainable for the SBA: pure Node built-ins (`node:fs`), **no external dependency**.

## 2. Log levels (production reference)
| Level | Priority | Meaning | Examples |
|---|---|---|---|
| `debug` | 10 | detailed diagnostic, normally off | request params, step-by-step flow |
| `info`  | 20 | normal operation | user login, book rented/returned, setup done |
| `warn`  | 30 | recoverable problem | deprecated path, retry, wrong-but-ignored input |
| `error` | 40 | operation failed but server continues | action threw, DB error |
| `fatal` | 50 | app cannot continue | DB won't open at startup |

Rule: a call is **emitted only if its priority ≥ configured level**. Defaults: dev `debug`/`info`, production `info`/`warn`.

## 3. Log entry format (one JSON line per event)
```json
{"ts":"2026-08-13T10:00:00.000Z","level":"ERROR","msg":"rentBook failed","meta":{"fn":"rentBook","user_id":5},"err":{"name":"Error","message":"...","stack":"..."}}
```
- `ts` — ISO UTC timestamp (or local for readability; keep ISO, format at view time).
- `level` — level name.
- `msg` — human message.
- `meta` — optional key/value context (function, user_id, isbn…).
- `err` — optional error name/message/stack (separate from meta so it can be colorized/parsed).
- JSON = one line per event ⇒ `grep`, `tail -f`, and an admin viewer can parse it easily.

## 4. Outputs (sinks)
1. **Console** — human-readable, colored (dev only / when TTY). Format: `[HH:MM:SS] LEVEL message` with ANSI colors:
   - `fatal`/`error` → **red**
   - `warn` → yellow
   - `info` → cyan/green
   - `debug` → gray
   - Also print the red error text to `console.error` (Todo #18).
2. **File** — `logs/app.log`, one JSON line per event (no colors). This is the **running log**; add to `.gitignore`.
3. *(Optional, later)* **SQLite `logs` table** for an in-app "View Logs" admin page (see §9).

> Client components cannot write the server log file. Keep `logger.ts` **server-only**; client components keep using browser `console` (devtools). Add `import "server-only"` to the logger to make the boundary explicit.

## 5. Rotation (production reference)
- When `logs/app.log` exceeds a size cap (default **1 MB**), rotate:
  `app.log → app.log.1 → app.log.2 → …` and keep the newest **5** files (drop the oldest).
- File starts fresh at each app start? **No** — append by default so the running log survives restarts. Rotation handles growth.
- Simple pure-Node implementation: check `statSync().size` before append; if over cap, rename chain, then write to a new `app.log`.

## 6. Configuration (env vars)
| Env | Default | Purpose |
|---|---|---|
| `LOG_LEVEL` | `debug` | minimum level emitted |
| `LOG_PATH` | `logs/` (relative to app root = `process.cwd()`) | log directory; absolute or relative override |
| `LOG_FILE` | `logs/app.log` | log file path (relative to project root) |
| `LOG_CONSOLE` | `true` in dev | toggle console sink |
| `LOG_ROTATE_BYTES` | `1048576` | rotate size cap |
| `LOG_KEEP` | `5` | number of rotated files to keep |

## 7. Module: `src/lib/logger.ts` (API)
```ts
// server-only
import "server-only";

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>): void,
  info (msg: string, meta?: Record<string, unknown>): void,
  warn (msg: string, meta?: Record<string, unknown>): void,
  error(msg: string, meta?: Record<string, unknown>, err?: unknown): void,
  fatal(msg: string, meta?: Record<string, unknown>, err?: unknown): void,
};
```
Internal flow:
```
level ok? -> build entry -> writeConsole() (colors) -> appendToFile() (JSONL, rotate)
```
- All writers are **synchronous** (fs.appendFileSync) so a crash just before a log line still shows earlier lines, and ordering is guaranteed. Volume is tiny for this app.

## 8. Integration points (replace existing console.log)
| File | Replace with | Notes |
|---|---|---|
| `src/lib/auth.ts` | `logger.error("signSession: ...", {fn}, err)` | every catch block |
| `src/lib/action.ts` | `logger.error("rentBook: ...", {fn}, err)` | action catches |
| `src/app/.../page.tsx` (5 pages) | `logger.error("…Page: …", {fn}, err)` | server component catches |
| `src/component/AnnouncementPanel.tsx` | `logger.error(...)` (it's a server comp) | |
| `src/proxy.ts` | `logger.debug("proxy", {pathname, session})` + optional request log | see §10 |
| `src/scripts/setup.ts` | keep its friendly `console.log` OR `logger.info` | setup is CLI, not the runtime log |
| Client components | keep browser `console` | cannot reach server logger |

## 9. Optional: SQLite log table + admin viewer
If you want to **see logs inside the app** (admin page):
```sql
CREATE TABLE IF NOT EXISTS logs (
  log_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      DATETIME DEFAULT (datetime('now')),
  level   TEXT NOT NULL,
  message TEXT NOT NULL,
  meta    TEXT,          -- JSON
  stack   TEXT
);
```
- Insert only `warn`/`error`/`fatal` (not debug/info) to keep the table small.
- New admin page `/admin/logs` reads recent rows (reuse `PageSelector`), paginated.
- Keep the JSONL file as the primary running log; the table is a convenience viewer.
- Guard: only admins can read (proxy already protects `/admin`).

## 10. Request correlation (optional enhancement)
Production systems tag a request id so one user action can be traced across lines.
- In `proxy.ts` (runs for every request) generate a short id and put it in a header, e.g. `x-request-id`.
- Server actions/pages read it via `headers()` and pass it in `meta: { reqId }`.
- Not required for this project; treat as a later enhancement. The `meta` field is already designed to carry it.

## 11. Security & privacy notes
- **Never log passwords** or the raw session cookie value.
- Truncate long values; avoid logging entire FormData.
- `logs/` folder must be added to `.gitignore` (do not commit runtime logs — they may contain usernames/IPs).
- The `session` column in `users` is already excluded from `userRecordFields`; same principle for logs.

## 12. Implementation tasks (checklist)
- [X] 1. Create `src/lib/logger.ts` — levels, priority filter, colored console (`console.error` red for error/fatal), JSONL file writer, rotation helper.
- [X] 2. Add `logs/` to `.gitignore`.
- [ ] 3. Wire config from env vars with sensible defaults.
- [ ] 4. Replace catch-block `console.log` in `src/lib/auth.ts` (7 sites).
- [ ] 5. Replace `console.log` in `src/lib/action.ts` (5 sites).
- [ ] 6. Replace page/component catches (`bookSearch`, `rentalList`, `userList`, `rentalRecords`, `announcement/[ann_id]`, `AnnouncementPanel`).
- [ ] 7. `proxy.ts`: debug log per request (pathname, authed?) — covers "running log" visibility.
- [ ] 8. Verify rotation by temporarily lowering `LOG_ROTATE_BYTES` and generating many lines.
- [ ] 9. *(Optional)* `logs` table + `/admin/logs` viewer page.
- [ ] 10. Mark Todo #18 done (red error console is provided by the colored console sink).
