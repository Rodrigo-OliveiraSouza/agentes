import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { cachedJson } from '../lib/cache';
import { ApiError } from '../lib/errors';
import { fetchGeoJson } from '../lib/ibge';
import type { AppBindings, TerritoryLevel } from '../lib/types';

const querySchema = z.object({
  level: z.enum(['REGIAO', 'UF', 'MUNICIPIO']),
  code: z.string().optional(),
  simplified: z
    .string()
    .optional()
    .transform((value) => value === 'true')
    .default('true'),
});

export const geojsonRoute = new Hono<{ Bindings: AppBindings }>();

geojsonRoute.get('/', zValidator('query', querySchema), async (c) => {
  const { level, code, simplified } = c.req.valid('query');

  if (level === 'MUNICIPIO' && !code) {
    throw new ApiError(
      400,
      'MUNICIPIO_PARENT_REQUIRED',
      'Para nível MUNICIPIO, informe code com a UF (ex.: 29 para Bahia).',
    );
  }

  return cachedJson(
    c,
    'geojson',
    { level, code, simplified },
    async () => {
      const geojson = await fetchGeoJson(level as TerritoryLevel, code, simplified);
      return {
        level,
        code: code ?? null,
        simplified,
        geojson,
      };
    },
    simplified ? 86_400 : 21_600,
  );
});

