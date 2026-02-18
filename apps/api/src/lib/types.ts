export type TerritoryLevel = 'REGIAO' | 'UF' | 'MUNICIPIO';

export type IndicatorSlug =
  | 'population'
  | 'gdp'
  | 'demographic_density'
  | 'territory_area'
  | 'idh'
  | 'crime_rate'
  | 'income_per_capita'
  | 'unemployment_rate'
  | 'gini_index'
  | 'extreme_poverty_rate'
  | 'literacy_rate'
  | 'school_attendance_rate'
  | 'higher_education_rate'
  | 'infant_mortality_rate'
  | 'life_expectancy'
  | 'prenatal_coverage'
  | 'primary_care_coverage'
  | 'water_network_coverage'
  | 'sewer_network_coverage'
  | 'garbage_collection_coverage'
  | 'internet_access_rate'
  | 'electricity_access_rate'
  | 'homicide_rate'
  | 'robbery_rate'
  | 'traffic_mortality_rate'
  | 'aging_index'
  | 'fertility_rate';

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
  sourceLabel?: string;
  sourceUrl?: string;
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

