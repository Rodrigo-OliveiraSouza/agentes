import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { getSql } from '../lib/db';
import { ApiError } from '../lib/errors';
import type { AppBindings } from '../lib/types';

const HOME_CONTENT_KEY = 'landing-page';

const payloadSchema = z.object({
  content: z.record(z.string(), z.unknown()),
});

const parseStoredPayload = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
};

const isMissingHomeContentTableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const asRecord = error as { message?: string };
  return Boolean(asRecord.message?.toLowerCase().includes('relation "home_contents" does not exist'));
};

export const homeContentRoute = new Hono<{ Bindings: AppBindings }>();

homeContentRoute.get('/', async (c) => {
  const sql = getSql(c.env);
  if (!sql) {
    return c.json({
      item: null,
      updatedAt: null,
      persisted: false,
      reason: 'DATABASE_UNAVAILABLE',
    });
  }

  let rows: unknown[] = [];
  try {
    rows = await sql`
      SELECT payload, updated_at
      FROM home_contents
      WHERE key = ${HOME_CONTENT_KEY}
      LIMIT 1
    `;
  } catch (error) {
    if (isMissingHomeContentTableError(error)) {
      return c.json({
        item: null,
        updatedAt: null,
        persisted: false,
        reason: 'MIGRATION_REQUIRED',
      });
    }
    throw error;
  }

  if (!rows.length) {
    return c.json({
      item: null,
      updatedAt: null,
      persisted: false,
      reason: 'EMPTY',
    });
  }

  const row = rows[0] as { payload: unknown; updated_at: string | Date | null };
  return c.json({
    item: parseStoredPayload(row.payload),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    persisted: true,
  });
});

homeContentRoute.put('/', zValidator('json', payloadSchema), async (c) => {
  const sql = getSql(c.env);
  if (!sql) {
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Banco de dados indisponivel para salvar conteudo da home.');
  }

  const { content } = c.req.valid('json');
  let rows: unknown[] = [];
  try {
    rows = await sql`
      INSERT INTO home_contents (key, payload, updated_at)
      VALUES (${HOME_CONTENT_KEY}, ${JSON.stringify(content)}, NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = NOW()
      RETURNING updated_at
    `;
  } catch (error) {
    if (isMissingHomeContentTableError(error)) {
      throw new ApiError(
        500,
        'MIGRATION_REQUIRED',
        'Tabela home_contents ausente. Rode a migracao antes de salvar conteudo da home.',
      );
    }
    throw error;
  }

  const updatedAt = rows.length ? new Date((rows[0] as { updated_at: string | Date }).updated_at).toISOString() : null;
  return c.json({
    ok: true,
    updatedAt,
    persisted: true,
  });
});
