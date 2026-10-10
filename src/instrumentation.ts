/**
 * Next.js instrumentation hook — runs once when the server process starts
 * (`next dev`, `next start`, and the standalone `server.js`).
 *
 * Why this exists:
 *   db-init.ts is otherwise only reached from `npm run setup`, and
 *   scripts/build-portable.sh runs that step only when `library.db` is MISSING.
 *   Any installation that already has a database therefore never received later
 *   schema changes — the likes/comments indexes added in this round would never
 *   reach an existing deployment. Running initDB() here makes the schema
 *   self-healing on boot instead of depending on a manual re-run.
 *
 * initDB() is idempotent (CREATE ... IF NOT EXISTS + a repeatable dedupe), so
 * this costs one schema check per boot.
 *
 * A failure is logged rather than fatal: the app still works against an
 * un-migrated database, it just lacks the newer indexes/constraints. Crashing
 * the server would be a worse outcome than booting without them.
 */
export async function register() {
  // This file is also compiled for the edge runtime, where the native
  // better-sqlite3 binding cannot load. Everything Node-specific is imported
  // lazily below so it never enters an edge bundle.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initDB } = await import("./lib/db-init");
  const { logger } = await import("./lib/logger");

  try {
    await initDB();
    logger.info("Database schema ensured", { fn: "instrumentation.register" });
  } catch (err) {
    logger.error("Database migration failed", { fn: "instrumentation.register" }, err);
  }
}
