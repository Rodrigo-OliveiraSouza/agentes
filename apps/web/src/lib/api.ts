import type {
  CityProfileResponse,
  DataResponse,
  GeoJsonResponse,
  IndicatorDefinition,
  Territory,
  TerritoryLevel,
} from './types';

const DEFAULT_PUBLIC_API_BASE = 'https://ibge-map-api.rodrigoliveira0001.workers.dev';
const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

const isLoopbackHost = (host: string): boolean => {
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' || host === '[::1]';
};

const isLoopbackUrl = (url: string): boolean => {
  try {
    return isLoopbackHost(new URL(url).hostname);
  } catch {
    return false;
  }
};

const isLocalBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  return isLoopbackHost(window.location.hostname);
};

const resolveApiBase = (): string => {
  if (RAW_API_BASE) {
    if (isLoopbackUrl(RAW_API_BASE) && !isLocalBrowser()) {
      return DEFAULT_PUBLIC_API_BASE;
    }
    return RAW_API_BASE.replace(/\/+$/, '');
  }

  if (import.meta.env.PROD && !isLocalBrowser()) {
    return DEFAULT_PUBLIC_API_BASE;
  }

  return '';
};

const API_BASE = resolveApiBase();
const CACHE_PREFIX = 'ibge-map-cache-v7';

type RequestParams = Record<string, string | number | boolean | undefined>;

type RequestOptions = {
  cacheTtlSeconds?: number;
};

type HomeContentResponse = {
  item: Record<string, unknown> | null;
  updatedAt: string | null;
  persisted: boolean;
};

type SaveHomeContentResponse = {
  ok: boolean;
  updatedAt: string | null;
  persisted: boolean;
};

type CachedEntry<T> = {
  expiresAt: number;
  payload: T;
};

const buildUrl = (path: string, params?: RequestParams): string => {
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

const buildCacheKey = (url: string): string => `${CACHE_PREFIX}:${url}`;

const readCache = <T>(key: string): CachedEntry<T> | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = <T>(key: string, payload: T, ttlSeconds: number): void => {
  try {
    const entry: CachedEntry<T> = {
      expiresAt: Date.now() + ttlSeconds * 1000,
      payload,
    };
    const serialized = JSON.stringify(entry);
    if (serialized.length > 4_500_000) return;
    localStorage.setItem(key, serialized);
  } catch {
    // Ignore storage quota or serialization failures.
  }
};

const request = async <T>(path: string, params?: RequestParams, options?: RequestOptions): Promise<T> => {
  const url = buildUrl(path, params);
  const cacheKey = buildCacheKey(url);
  const ttlSeconds = options?.cacheTtlSeconds ?? 0;

  if (ttlSeconds > 0) {
    const cached = readCache<T>(cacheKey);
    if (cached) {
      return cached.payload;
    }
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: { message: 'Erro desconhecido' } }));
      throw new Error(payload?.error?.message ?? 'Erro na API');
    }

    const payload = (await response.json()) as T;

    if (ttlSeconds > 0) {
      writeCache(cacheKey, payload, ttlSeconds);
    }

    return payload;
  } catch (error) {
    const fallback = readCache<T>(cacheKey);
    if (fallback) {
      return fallback.payload;
    }
    throw error;
  }
};

const requestMutation = async <T>(path: string, method: 'PUT' | 'POST' | 'PATCH' | 'DELETE', body: unknown): Promise<T> => {
  const url = buildUrl(path);
  const response = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: 'Erro desconhecido' } }));
    throw new Error(payload?.error?.message ?? 'Erro na API');
  }

  return (await response.json()) as T;
};

export const api = {
  indicators: async (): Promise<IndicatorDefinition[]> => {
    const payload = await request<{ items: IndicatorDefinition[] }>('/api/indicators', undefined, {
      cacheTtlSeconds: 86_400,
    });
    return payload.items;
  },

  territories: async (level: TerritoryLevel, parentCode?: string, search?: string): Promise<Territory[]> => {
    const payload = await request<{ items: Territory[] }>(
      '/api/territories',
      { level, parentCode, search },
      { cacheTtlSeconds: 86_400 },
    );
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
    return request<DataResponse>('/api/data', params, { cacheTtlSeconds: 3_600 });
  },

  geojson: async (params: {
    level: TerritoryLevel;
    code?: string;
    simplified?: boolean;
  }): Promise<GeoJsonResponse> => {
    return request<GeoJsonResponse>('/api/geojson', params, { cacheTtlSeconds: 86_400 });
  },

  cityProfile: async (cityCode: string): Promise<CityProfileResponse> => {
    return request<CityProfileResponse>('/api/city-profile', { cityCode }, { cacheTtlSeconds: 86_400 });
  },

  homeContent: async (): Promise<HomeContentResponse> => {
    return request<HomeContentResponse>('/api/home-content');
  },

  saveHomeContent: async (content: unknown): Promise<SaveHomeContentResponse> => {
    return requestMutation<SaveHomeContentResponse>('/api/home-content', 'PUT', { content });
  },
};
