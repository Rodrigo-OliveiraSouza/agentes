import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { cachedJson } from '../lib/cache';
import { ApiError } from '../lib/errors';
import { fetchIndicatorData, getIndicatorDefinition, INDICATOR_SLUGS } from '../lib/ibge';
import type { AppBindings, IndicatorSlug, TerritoryLevel } from '../lib/types';

const indicatorEnum = z.enum(INDICATOR_SLUGS as [IndicatorSlug, ...IndicatorSlug[]]);

const querySchema = z.object({
  indicator: indicatorEnum,
  level: z.enum(['REGIAO', 'UF', 'MUNICIPIO']).default('UF'),
  code: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(20000).default(10000),
});

export const dataRoute = new Hono<{ Bindings: AppBindings }>();

dataRoute.get('/', zValidator('query', querySchema), async (c) => {
  const { indicator, level, code, year: requestedYear, search, limit } = c.req.valid('query');
  const indicatorSlug = indicator as IndicatorSlug;
  const indicatorDefinition = getIndicatorDefinition(indicatorSlug);

  if (!indicatorDefinition) {
    throw new ApiError(400, 'INVALID_INDICATOR', 'Indicador invalido.', { indicator });
  }

  if (!indicatorDefinition.supported) {
    throw new ApiError(
      501,
      'INDICATOR_NOT_IMPLEMENTED',
      'Indicador ainda nao implementado no MVP. Fonte alternativa continua plugavel.',
      { indicator: indicatorSlug },
    );
  }

  const minYear = indicatorDefinition.yearMin ?? 1900;
  const maxYear = indicatorDefinition.yearMax ?? 2100;
  const defaultYear = indicatorDefinition.defaultYear ?? maxYear;
  const effectiveYear = requestedYear ?? defaultYear;

  if (effectiveYear < minYear || effectiveYear > maxYear) {
    throw new ApiError(400, 'UNSUPPORTED_YEAR', `Ano fora da faixa suportada para ${indicatorSlug}.`, {
      indicator: indicatorSlug,
      requestedYear: effectiveYear,
      yearMin: minYear,
      yearMax: maxYear,
      defaultYear,
    });
  }

  return cachedJson(
    c,
    'data',
    { indicator: indicatorSlug, level, code, year: effectiveYear, search, limit, schemaVersion: '2026-02-18-v2' },
    async () => {
      const points = await fetchIndicatorData(indicatorSlug, level as TerritoryLevel, effectiveYear, code);
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
        indicator: indicatorSlug,
        level,
        code: code ?? null,
        year: effectiveYear,
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
