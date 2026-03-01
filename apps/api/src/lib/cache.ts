import { getSql, getSqlRows } from './db';
import type { AppBindings } from './types';

type CacheContext = {
  env: AppBindings;
  executionCtx: ExecutionContext;
};

type CachedPayload = Record<string, unknown>;

const cacheKeyFrom = (namespace: string, params: Record<string, string | number | boolean | undefined>): string => {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}:${String(params[key] ?? '')}`)
    .join('|');

  return `${namespace}::${sorted}`;
};

const cacheRequest = (key: string) => new Request(`https://cache.ibge-map.local/${encodeURIComponent(key)}`);
const edgeCacheName = 'ibge-map-cache';

const getEdgeCache = async (): Promise<Cache | null> => {
  if (typeof caches === 'undefined') {
    return null;
  }

  return caches.open(edgeCacheName);
};

const jsonResponse = (payload: unknown, cacheStatus: 'HIT' | 'MISS'): Response =>
  new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-cache-status': cacheStatus,
    },
  });

const parseStoredPayload = (raw: unknown): CachedPayload | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as CachedPayload;
    } catch {
      return null;
    }
  }

  if (typeof raw === 'object') {
    return raw as CachedPayload;
  }

  return null;
};

const readFromPostgres = async (env: AppBindings, key: string): Promise<CachedPayload | null> => {
  try {
    const sql = getSql(env);
    if (!sql) return null;

    const rows = getSqlRows<{ payload: unknown; expires_at: string }>(await sql`
      SELECT payload, expires_at
      FROM cache_requests
      WHERE key = ${key}
      LIMIT 1
    `);

    if (!rows.length) return null;

    const row = rows[0];
    const expiresAt = new Date(row.expires_at).getTime();
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return null;
    }

    return parseStoredPayload(row.payload);
  } catch (error) {
    console.warn('Postgres cache read failed, continuing without DB cache.', error);
    return null;
  }
};

const writeToPostgres = async (
  env: AppBindings,
  key: string,
  params: Record<string, string | number | boolean | undefined>,
  payload: CachedPayload,
  ttlSeconds: number,
): Promise<void> => {
  try {
    const sql = getSql(env);
    if (!sql) return;

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await sql`
      INSERT INTO cache_requests (key, params, payload, expires_at, updated_at)
      VALUES (${key}, ${JSON.stringify(params)}, ${JSON.stringify(payload)}, ${expiresAt}, NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        params = EXCLUDED.params,
        payload = EXCLUDED.payload,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    `;
  } catch (error) {
    console.warn('Postgres cache write failed, continuing without DB cache.', error);
  }
};

export const cachedJson = async <T extends CachedPayload>(
  c: CacheContext,
  namespace: string,
  params: Record<string, string | number | boolean | undefined>,
  producer: () => Promise<T>,
  ttlSeconds?: number,
): Promise<Response> => {
  const effectiveTtl = ttlSeconds ?? Number(c.env.CACHE_TTL_SECONDS ?? '600');
  const key = cacheKeyFrom(namespace, params);
  const request = cacheRequest(key);
  const edgeCache = await getEdgeCache();

  if (edgeCache) {
    const edgeHit = await edgeCache.match(request);
    if (edgeHit) {
      return jsonResponse(await edgeHit.json(), 'HIT');
    }
  }

  if (c.env.CACHE_KV) {
    const kvHit = await c.env.CACHE_KV.get(key, 'json');
    if (kvHit) {
      if (edgeCache) {
        c.executionCtx.waitUntil(
          edgeCache.put(
            request,
            new Response(JSON.stringify(kvHit), {
              headers: {
                'content-type': 'application/json; charset=utf-8',
                'cache-control': `public, max-age=${effectiveTtl}`,
              },
            }),
          ),
        );
      }

      return jsonResponse(kvHit as CachedPayload, 'HIT');
    }
  }

  const postgresHit = await readFromPostgres(c.env, key);
  if (postgresHit) {
    if (edgeCache) {
      c.executionCtx.waitUntil(
        edgeCache.put(
          request,
          new Response(JSON.stringify(postgresHit), {
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': `public, max-age=${effectiveTtl}`,
            },
          }),
        ),
      );
    }

    if (c.env.CACHE_KV) {
      c.executionCtx.waitUntil(c.env.CACHE_KV.put(key, JSON.stringify(postgresHit), { expirationTtl: effectiveTtl }));
    }

    return jsonResponse(postgresHit, 'HIT');
  }

  const payload = await producer();

  if (edgeCache) {
    c.executionCtx.waitUntil(
      edgeCache.put(
        request,
        new Response(JSON.stringify(payload), {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': `public, max-age=${effectiveTtl}`,
          },
        }),
      ),
    );
  }

  if (c.env.CACHE_KV) {
    c.executionCtx.waitUntil(c.env.CACHE_KV.put(key, JSON.stringify(payload), { expirationTtl: effectiveTtl }));
  }

  c.executionCtx.waitUntil(writeToPostgres(c.env, key, params, payload, effectiveTtl));
  return jsonResponse(payload, 'MISS');
};
