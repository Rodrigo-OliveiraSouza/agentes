import { Hono } from 'hono';
import { cachedJson } from '../lib/cache';
import { INDICATORS } from '../lib/ibge';
import type { AppBindings } from '../lib/types';

export const indicatorsRoute = new Hono<{ Bindings: AppBindings }>();

indicatorsRoute.get('/', async (c) => {
  return cachedJson(
    c,
    'indicators',
    {},
    async () => ({
      count: INDICATORS.length,
      items: INDICATORS,
    }),
    86_400,
  );
});

