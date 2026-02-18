import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { cachedJson } from '../lib/cache';
import { fetchCityProfile } from '../lib/ibge';
import type { AppBindings } from '../lib/types';

const querySchema = z.object({
  cityCode: z.string().regex(/^\d{7}$/),
});

export const cityProfileRoute = new Hono<{ Bindings: AppBindings }>();

cityProfileRoute.get('/', zValidator('query', querySchema), async (c) => {
  const { cityCode } = c.req.valid('query');

  return cachedJson(
    c,
    'city-profile',
    { cityCode, schemaVersion: '2026-02-18-v3' },
    async () => {
      const payload = await fetchCityProfile(cityCode);
      return payload;
    },
    86_400,
  );
});
