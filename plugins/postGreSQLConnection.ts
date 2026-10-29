import { ENV } from "@globalVariable";
import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function sanitizeConnectionString(rawUrl: string): string {
  const match = rawUrl.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.+)@([^@]+)$/);
  if (!match) {
    return rawUrl;
  }
  const [, proto, user, rawPassword, rest] = match;
  let cleanPassword = rawPassword;
  if (cleanPassword.startsWith("[") && cleanPassword.endsWith("]")) {
    cleanPassword = cleanPassword.slice(1, -1);
  }
  let encodedPassword = cleanPassword;
  try {
    if (decodeURIComponent(cleanPassword) === cleanPassword) {
      encodedPassword = encodeURIComponent(cleanPassword);
    }
  } catch {
    encodedPassword = encodeURIComponent(cleanPassword);
  }
  return `${proto}${user}:${encodedPassword}@${rest}`;
}

export function getDatabasePool(): Pool {
  if (pool) {
    return pool;
  }

  const rawUrl = (ENV.DATABASE_URL || "").trim();
  if (!rawUrl) {
    throw new Error(
      "[PostgreSQL] DATABASE_URL is not configured in configs/.env. Direct database connection is required."
    );
  }

  if (!rawUrl.startsWith("postgres://") && !rawUrl.startsWith("postgresql://")) {
    throw new Error(`[PostgreSQL] DATABASE_URL must start with postgres:// or postgresql:// (received "${rawUrl}").`);
  }

  const connectionString = sanitizeConnectionString(rawUrl);

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  return pool;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Helper function for executing direct PostgreSQL queries.
 * Throws error if connection or query fails.
 */
export async function query<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<T[]> {
  const activePool = getDatabasePool();
  const client = await activePool.connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export const db = {
  query,
  getPool: getDatabasePool,
  close: closeDatabaseConnection
};
