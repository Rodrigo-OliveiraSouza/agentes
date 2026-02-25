export type TerritoryLevel = 'REGIAO' | 'UF' | 'MUNICIPIO';

export type ViewMode = 'choropleth' | 'bubbles' | 'heatmap' | 'clusters';

export type Territory = {
  code: string;
  name: string;
  level: TerritoryLevel;
  parentCode: string | null;
  uf?: string | null;
};

export type IndicatorDefinition = {
  slug: string;
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

export type DataResponse = {
  indicator: string;
  level: TerritoryLevel;
  code: string | null;
  year: number;
  count: number;
  stats: {
    min: number;
    max: number;
    average: number;
    total: number;
  };
  items: IndicatorPoint[];
};

export type GeoJsonResponse = {
  level: TerritoryLevel;
  code: string | null;
  simplified: boolean;
  geojson: GeoJSON.FeatureCollection;
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

export type CityProfileResponse = {
  cityCode: string;
  cityName: string;
  ufCode: string;
  metrics: CityProfileMetric[];
};

