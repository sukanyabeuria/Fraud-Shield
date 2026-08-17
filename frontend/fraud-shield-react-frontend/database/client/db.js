/**
 * ============================================================================
 *  FRAUD-SHIELD — PostgreSQL connection layer (Node.js / node-postgres)
 * ============================================================================
 *  This is NOT the backend. It is the thin, reusable database module the future
 *  Express/Fastify/NestJS API will import:
 *
 *      import { query, withTransaction } from '../database/client/db.js';
 *
 *  Security rules baked in:
 *    • credentials come from environment variables only (never hard-coded)
 *    • every call uses PARAMETERISED queries ($1, $2 …) — no string building
 *    • a statement timeout prevents a runaway query from pinning a connection
 *    • pool limits protect PostgreSQL from connection exhaustion
 *
 *  Requires:  npm install pg dotenv
 * ============================================================================
 */

import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

/* ---------------------------------------------------------------------------
 * Numeric handling: node-postgres returns NUMERIC as a string to avoid float
 * precision loss. Money must stay exact, so we keep amounts as strings and let
 * the API format them. Small integer-ish types are parsed to Number.
 * ------------------------------------------------------------------------- */
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8/bigint

const ssl =
  process.env.PGSSLMODE && process.env.PGSSLMODE !== "disable"
    ? { rejectUnauthorized: process.env.PGSSLMODE === "verify-full" }
    : false;

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl,
        max: Number(process.env.DB_POOL_MAX ?? 10),
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
        connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5000),
        statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 15000),
      }
    : {
        host: process.env.PGHOST ?? "localhost",
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE ?? "fraudshield",
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl,
        max: Number(process.env.DB_POOL_MAX ?? 10),
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
        connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5000),
        statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 15000),
      }
);

// Always resolve unqualified names inside the application schema.
const SCHEMA = process.env.PGSCHEMA ?? "fraudshield";
pool.on("connect", (client) => {
  client.query(`SET search_path TO ${SCHEMA}, public`);
});

pool.on("error", (err) => {
  // A backend client was idle when the server closed the connection.
  console.error("[db] unexpected idle client error:", err.message);
});

/**
 * Run a parameterised query.
 * @param {string} text  SQL with $1, $2 … placeholders
 * @param {Array}  params
 */
export async function query(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production" && duration > 300) {
    console.warn(`[db] slow query ${duration}ms :: ${text.slice(0, 90)}…`);
  }
  return res;
}

/** Convenience: first row or null. */
export async function queryOne(text, params = []) {
  const { rows } = await query(text, params);
  return rows[0] ?? null;
}

/**
 * Run several statements inside ONE transaction.
 * Used by POST /api/fraud/predict so prediction + indicators + explanation are
 * committed together or not at all.
 *
 *   await withTransaction(async (client) => {
 *     await client.query('SELECT set_config($1,$2,true)', ['fraudshield.change_source','ANALYST']);
 *     await client.query('UPDATE transactions SET status=$1 WHERE reference=$2', ['SAFE', ref]);
 *   });
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Liveness probe for GET /api/health. */
export async function healthCheck() {
  const row = await queryOne(
    "SELECT current_database() AS db, current_user AS role, version() AS version, now() AS server_time"
  );
  return { ok: true, ...row };
}

export async function closePool() {
  await pool.end();
}

export default { pool, query, queryOne, withTransaction, healthCheck, closePool };
