import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ensureHomeContentTable, getSql, getSqlRows } from '../lib/db';
import { ApiError } from '../lib/errors';
import type { AppBindings } from '../lib/types';

const HOME_CONTENT_KEY = 'landing-page';
const MAX_INLINE_IMAGE_URL_BYTES = 100_000;
const HOME_CONTENT_IMAGE_SECTIONS = ['carousel', 'news', 'mediaItems'] as const;

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

const getUtf8ByteLength = (value: string): number => new TextEncoder().encode(value).length;

const isOversizedInlineImageUrl = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().startsWith('data:image/') && getUtf8ByteLength(value) > MAX_INLINE_IMAGE_URL_BYTES;
};

const sanitizeImageItems = (value: unknown): unknown => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return item;
    }

    const nextItem = { ...(item as Record<string, unknown>) };
    if (isOversizedInlineImageUrl(nextItem.imageUrl)) {
      nextItem.imageUrl = '';
    }

    return nextItem;
  });
};

const sanitizeOversizedInlineImages = (payload: Record<string, unknown>): Record<string, unknown> => {
  const nextPayload = { ...payload };

  for (const section of HOME_CONTENT_IMAGE_SECTIONS) {
    nextPayload[section] = sanitizeImageItems(nextPayload[section]);
  }

  return nextPayload;
};

const hasOversizedInlineImages = (payload: Record<string, unknown>): boolean => {
  return HOME_CONTENT_IMAGE_SECTIONS.some((section) => {
    const items = payload[section];
    if (!Array.isArray(items)) {
      return false;
    }

    return items.some((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }

      return isOversizedInlineImageUrl((item as Record<string, unknown>).imageUrl);
    });
  });
};

const buildDatabaseError = (code: string, action: string, error: unknown): ApiError => {
  const reason = error instanceof Error && error.message.trim() ? error.message.trim() : 'Erro desconhecido ao acessar o banco.';
  return new ApiError(503, code, `Falha ao ${action} conteudo da home no banco de dados. ${reason}`);
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

  try {
    await ensureHomeContentTable(sql);

    const rows = getSqlRows<{ payload: unknown; updated_at: string | Date | null }>(await sql`
      SELECT payload, updated_at
      FROM home_contents
      WHERE key = ${HOME_CONTENT_KEY}
      LIMIT 1
    `);

    if (!rows.length) {
      return c.json({
        item: null,
        updatedAt: null,
        persisted: false,
        reason: 'EMPTY',
      });
    }

    const row = rows[0];
    const parsedPayload = parseStoredPayload(row.payload);
    return c.json({
      item: parsedPayload ? sanitizeOversizedInlineImages(parsedPayload) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      persisted: true,
    });
  } catch (error) {
    throw buildDatabaseError('DATABASE_READ_FAILED', 'ler', error);
  }
});

homeContentRoute.put('/', zValidator('json', payloadSchema), async (c) => {
  const sql = getSql(c.env);
  if (!sql) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Banco de dados indisponivel para salvar conteudo da home. Configure DATABASE_URL no Worker ou em apps/api/.dev.vars.',
    );
  }

  const { content } = c.req.valid('json');
  if (hasOversizedInlineImages(content)) {
    throw new ApiError(
      400,
      'OVERSIZED_INLINE_IMAGE_UNSUPPORTED',
      'Imagens inline muito grandes não podem ser publicadas na home. Use uma URL pública ou um arquivo servido por apps/web/public.',
    );
  }

  const serializedContent = JSON.stringify(content);

  try {
    await ensureHomeContentTable(sql);

    const rows = getSqlRows<{ updated_at: string | Date }>(await sql`
      INSERT INTO home_contents (key, payload, updated_at)
      VALUES (${HOME_CONTENT_KEY}, ${serializedContent}::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = NOW()
      RETURNING updated_at
    `);

    const updatedAt = rows.length ? new Date(rows[0].updated_at).toISOString() : null;
    return c.json({
      ok: true,
      updatedAt,
      persisted: true,
    });
  } catch (error) {
    throw buildDatabaseError('DATABASE_WRITE_FAILED', 'salvar', error);
  }
});
