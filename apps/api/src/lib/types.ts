export type TerritoryLevel = 'REGIAO' | 'UF' | 'MUNICIPIO';

export type IndicatorSlug = 'population' | 'gdp' | 'idh' | 'demographic_density' | 'crime_rate';

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
  notes?: string;
};

export type IndicatorPoint = {
  code: string;
  name: string;
  level: TerritoryLevel;
  year: number;
  value: number;
};

