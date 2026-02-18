import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { cachedJson } from '../lib/cache';
import { ApiError } from '../lib/errors';
import { fetchPopulation } from '../lib/ibge';
import type { AppBindings, TerritoryLevel } from '../lib/types';

const querySchema = z.object({
  indicator: z.enum(['population', 'gdp', 'idh', 'demographic_density', 'crime_rate']),
  level: z.enum(['REGIAO', 'UF', 'MUNICIPIO']).default('UF'),
  code: z.string().optional(),
  year: z.coerce.number().int().min(2010).max(2030).default(2022),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(20000).default(10000),
});

export const dataRoute = new Hono<{ Bindings: AppBindings }>();

dataRoute.get('/', zValidator('query', querySchema), async (c) => {
  const { indicator, level, code, year, search, limit } = c.req.valid('query');

  if (indicator !== 'population') {
    throw new ApiError(
      501,
      'INDICATOR_NOT_IMPLEMENTED',
      'No MVP apenas o indicador population está disponível via IBGE. Indicadores alternativos continuam plugáveis.',
      { indicator },
    );
  }

  if (year !== 2022) {
    throw new ApiError(
      400,
      'UNSUPPORTED_YEAR',
      'No MVP, o indicador population está disponível apenas para o ano de 2022.',
      { year },
    );
  }

  return cachedJson(
    c,
    'data',
    { indicator, level, code, year, search, limit },
    async () => {
      const points = await fetchPopulation(level as TerritoryLevel, year, code);
      const normalizedSearch = search?.trim().toLowerCase();
      const filtered = normalizedSearch
        ? points.filter((point) => point.name.toLowerCase().includes(normalizedSearch))
        : points;

      const sorted = [...filtered].sort((a, b) => b.value - a.value);
      const top = sorted.slice(0, limit);

      const totalValue = filtered.reduce((sum, row) => sum + row.value, 0);
      const min = filtered.length ? Math.min(...filtered.map((row) => row.value)) : 0;
      const max = filtered.length ? Math.max(...filtered.map((row) => row.value)) : 0;

      return {
        indicator,
        level,
        code: code ?? null,
        year,
        count: filtered.length,
        stats: {
          min,
          max,
          average: filtered.length ? totalValue / filtered.length : 0,
          total: totalValue,
        },
        items: top,
      };
    },
    1800,
  );
});

