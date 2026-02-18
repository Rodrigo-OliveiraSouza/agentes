import type { DataResponse, GeoJsonResponse, IndicatorDefinition, Territory, TerritoryLevel } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const buildUrl = (path: string, params?: Record<string, string | number | boolean | undefined>): string => {
  const base = `${API_BASE}${path}`;
  if (!params) return base;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }

  const serialized = query.toString();
  return serialized ? `${base}?${serialized}` : base;
};

const request = async <T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> => {
  const response = await fetch(buildUrl(path, params));

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: 'Erro desconhecido' } }));
    throw new Error(payload?.error?.message ?? 'Erro na API');
  }

  return (await response.json()) as T;
};

export const api = {
  indicators: async (): Promise<IndicatorDefinition[]> => {
    const payload = await request<{ items: IndicatorDefinition[] }>('/api/indicators');
    return payload.items;
  },

  territories: async (level: TerritoryLevel, parentCode?: string, search?: string): Promise<Territory[]> => {
    const payload = await request<{ items: Territory[] }>('/api/territories', { level, parentCode, search });
    return payload.items;
  },

  data: async (params: {
    indicator: string;
    level: TerritoryLevel;
    code?: string;
    year: number;
    search?: string;
    limit?: number;
  }): Promise<DataResponse> => {
    return request<DataResponse>('/api/data', params);
  },

  geojson: async (params: {
    level: TerritoryLevel;
    code?: string;
    simplified?: boolean;
  }): Promise<GeoJsonResponse> => {
    return request<GeoJsonResponse>('/api/geojson', params);
  },
};

