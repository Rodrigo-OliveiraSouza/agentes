import type {
  CityProfileResponse,
  DataResponse,
  GeoJsonResponse,
  IndicatorDefinition,
  Territory,
  TerritoryLevel,
} from './types';
import { isNativeApp } from './runtime';

const DEFAULT_PUBLIC_API_BASE = import.meta.env.DEV ? '' : 'https://ibge-map-api.rodrigoliveira0001.workers.dev';
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
  if (isNativeApp) return false;
  return isLoopbackHost(window.location.hostname);
};

const resolveApiBase = (): string => {
  if (RAW_API_BASE) {
    if (isLoopbackUrl(RAW_API_BASE) && !isLocalBrowser()) {
      return DEFAULT_PUBLIC_API_BASE;
    }
    return RAW_API_BASE.replace(/\/+$/, '');
  }

  return DEFAULT_PUBLIC_API_BASE;
};

const API_BASE = resolveApiBase();
const CACHE_PREFIX = 'ibge-map-cache-v8';

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

const PT_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bPopulacao\b/g, 'População'],
  [/\bprecos\b/g, 'preços'],
  [/\bdemografica\b/g, 'demográfica'],
  [/\balfabetizacao\b/g, 'alfabetização'],
  [/\bArea\b/g, 'Área'],
  [/\bdesocupacao\b/g, 'desocupação'],
  [/\bIndice\b/g, 'Índice'],
  [/\bfrequencia\b/g, 'frequência'],
  [/\bpre-natal\b/g, 'pré-natal'],
  [/\batencao primaria\b/g, 'atenção primária'],
  [/\bagua encanada\b/g, 'água encanada'],
  [/\bDomicilios\b/g, 'Domicílios'],
  [/\bacesso a internet\b/g, 'acesso à internet'],
  [/\bplugavel\b/g, 'plugável'],
  [/\bHomicidios\b/g, 'Homicídios'],
  [/\btransito\b/g, 'trânsito'],
  [/\bobitos\b/g, 'óbitos'],
  [/\bregiao\b/g, 'região'],
  [/\bvariavel\b/g, 'variável'],
  [/\bclassificacao\b/g, 'classificação'],
  [/\bconexao\b/g, 'conexão'],
  [/\bDemografico\b/g, 'Demográfico'],
  [/\bMunicipios\b/g, 'Municípios'],
  [/\bvitima\b/g, 'vítima'],
  [/\bvitimizacao\b/g, 'vitimização'],
  [/\bpopulacao\b/g, 'população'],
  [/\bCalculo\b/g, 'Cálculo'],
  [/\bnao\b/g, 'não'],
];

const normalizePtText = (value: string): string => {
  let normalized = value;
  for (const [pattern, replacement] of PT_TEXT_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
};

const normalizeIndicatorDefinition = (item: IndicatorDefinition): IndicatorDefinition => {
  return {
    ...item,
    label: normalizePtText(item.label),
    source: normalizePtText(item.source),
    sourceLabel: item.sourceLabel ? normalizePtText(item.sourceLabel) : item.sourceLabel,
    notes: item.notes ? normalizePtText(item.notes) : item.notes,
  };
};

const normalizeCityProfile = (payload: CityProfileResponse): CityProfileResponse => {
  return {
    ...payload,
    cityName: normalizePtText(payload.cityName),
    metrics: payload.metrics.map((metric) => ({
      ...metric,
      label: normalizePtText(metric.label),
      source: normalizePtText(metric.source),
      notes: metric.notes ? normalizePtText(metric.notes) : metric.notes,
    })),
  };
};

const buildHttpErrorMessage = async (response: Response, url: string): Promise<string> => {
  const payload = await response.json().catch(() => null);
  const apiMessage =
    payload && typeof payload === 'object'
      ? (payload as { error?: { message?: string }; message?: string }).error?.message ??
        (payload as { message?: string }).message
      : null;

  if (apiMessage) {
    return apiMessage;
  }

  return `Erro na API (${response.status} ${response.statusText}) em ${url}. Verifique a URL da API no deploy.`;
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
      throw new Error(await buildHttpErrorMessage(response, url));
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
    throw new Error(await buildHttpErrorMessage(response, url));
  }

  return (await response.json()) as T;
};

export const api = {
  indicators: async (): Promise<IndicatorDefinition[]> => {
    const payload = await request<{ items: IndicatorDefinition[] }>('/api/indicators', undefined, {
      cacheTtlSeconds: 86_400,
    });
    return payload.items.map(normalizeIndicatorDefinition);
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
    const payload = await request<CityProfileResponse>('/api/city-profile', { cityCode }, { cacheTtlSeconds: 86_400 });
    return normalizeCityProfile(payload);
  },

  homeContent: async (): Promise<HomeContentResponse> => {
    return request<HomeContentResponse>('/api/home-content');
  },

  saveHomeContent: async (content: unknown): Promise<SaveHomeContentResponse> => {
    return requestMutation<SaveHomeContentResponse>('/api/home-content', 'PUT', { content });
  },
};
