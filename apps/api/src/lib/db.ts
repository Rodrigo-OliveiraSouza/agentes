import { neon } from '@neondatabase/serverless';
import type { AppBindings } from './types';

export type SqlClient = ReturnType<typeof neon>;
type SqlRow = Record<string, unknown>;

export const getSql = (env: AppBindings): SqlClient | null => {
  if (!env.DATABASE_URL) {
    return null;
  }

  return neon(env.DATABASE_URL);
};

export const ensureHomeContentTable = async (sql: SqlClient): Promise<void> => {
  await sql`
    CREATE TABLE IF NOT EXISTS home_contents (
      key TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
};

export const getSqlRows = <TRow extends SqlRow>(result: unknown): TRow[] => {
  if (Array.isArray(result)) {
    return result as TRow[];
  }

  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows as TRow[];
    }
  }

  return [];
};
