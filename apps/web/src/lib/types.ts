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

