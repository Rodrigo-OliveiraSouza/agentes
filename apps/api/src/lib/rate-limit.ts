import type { MiddlewareHandler } from 'hono';
import { ApiError } from './errors';
import type { AppBindings } from './types';

type BucketState = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, BucketState>();

const getClientKey = (headers: Headers): string => {
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'anonymous'
  );
};

export const rateLimitMiddleware = (): MiddlewareHandler<{ Bindings: AppBindings }> => {
  return async (c, next) => {
    const limit = Number(c.env.RATE_LIMIT_PER_MINUTE ?? '120');
    const now = Date.now();
    const key = getClientKey(c.req.raw.headers);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + 60_000 });
      await next();
      return;
    }

    if (bucket.count >= limit) {
      throw new ApiError(429, 'RATE_LIMITED', 'Limite de requisições por minuto excedido.');
    }

    bucket.count += 1;
    await next();
  };
};

