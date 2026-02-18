export type TerritoryLevel = 'REGIAO' | 'UF' | 'MUNICIPIO';

export type IndicatorSlug =
  | 'population'
  | 'gdp'
  | 'demographic_density'
  | 'territory_area'
  | 'idh'
  | 'crime_rate';

export type AppBindings = {
  DATABASE_URL?: string;
  CACHE_TTL_SECONDS?: string;
  RATE_LIMIT_PER_MINUTE?: string;
  CACHE_KV?: KVNamespace;
};

export type TerritoryItem = {
  code: string;
  name: string;
  level: TerritoryLevel;
  parentCode: string | null;
  uf?: string | null;
};

export type IndicatorDefinition = {
  slug: IndicatorSlug;
  label: string;
  unit: string;
  source: string;
  supported: boolean;
  yearMin?: number;
  yearMax?: number;
  defaultYear?: number;
  notes?: string;
};

export type IndicatorPoint = {
  code: string;
  name: string;
  level: TerritoryLevel;
  year: number;
  value: number;
};

export type ProfileMetricStatus = 'ok' | 'partial' | 'unavailable';

export type CityProfileMetric = {
  key: string;
  label: string;
  category: 'demografia' | 'economia' | 'educacao' | 'saude' | 'seguranca';
  source: string;
  unit: string;
  year: number | null;
  value: number | null;
  status: ProfileMetricStatus;
  notes?: string;
};

export type CityProfilePayload = {
  cityCode: string;
  cityName: string;
  ufCode: string;
  metrics: CityProfileMetric[];
};

