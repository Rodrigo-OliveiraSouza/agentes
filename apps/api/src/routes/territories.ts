import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { cachedJson } from '../lib/cache';
import { ApiError } from '../lib/errors';
import { fetchTerritories } from '../lib/ibge';
import type { AppBindings, TerritoryLevel } from '../lib/types';

const querySchema = z.object({
  level: z.enum(['REGIAO', 'UF', 'MUNICIPIO']),
  parentCode: z.string().optional(),
  search: z.string().optional(),
});

export const territoriesRoute = new Hono<{ Bindings: AppBindings }>();

territoriesRoute.get('/', zValidator('query', querySchema), async (c) => {
  const { level, parentCode, search } = c.req.valid('query');

  if (level === 'MUNICIPIO' && !parentCode) {
    throw new ApiError(
      400,
      'MUNICIPIO_PARENT_REQUIRED',
      'Para nível MUNICIPIO, informe parentCode com código da UF para evitar payload excessivo.',
    );
  }

  return cachedJson(
    c,
    'territories',
    { level, parentCode, search },
    async () => {
      const items = await fetchTerritories(level as TerritoryLevel, parentCode);
      const normalizedSearch = search?.trim().toLowerCase();
      const filtered = normalizedSearch
        ? items.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
        : items;

      return {
        level,
        parentCode: parentCode ?? null,
        count: filtered.length,
        items: filtered,
      };
    },
    86_400,
  );
});

