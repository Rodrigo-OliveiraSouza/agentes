import { ApiError } from './errors';
import type { IndicatorDefinition, IndicatorPoint, TerritoryItem, TerritoryLevel } from './types';

const LOCALIDADES_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const AGREGADOS_BASE = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const MALHAS_BASE = 'https://servicodados.ibge.gov.br/api/v3/malhas';

const POPULATION_AGGREGATE = '10211';
const POPULATION_VARIABLE = '93';
const POPULATION_CLASSIFICATIONS = 'classificacao=1[6795]|2661[32776]';

export const INDICATORS: IndicatorDefinition[] = [
  {
    slug: 'population',
    label: 'População residente',
    unit: 'pessoas',
    source: 'IBGE - Censo Demográfico (agregado 10211, variável 93)',
    supported: true,
  },
  {
    slug: 'gdp',
    label: 'PIB (planejado)',
    unit: 'R$ milhões',
    source: 'IBGE/SIDRA',
    supported: false,
    notes: 'Conector previsto para próxima sprint.',
  },
  {
    slug: 'idh',
    label: 'IDH (alternativo)',
    unit: 'índice',
    source: 'PNUD Atlas Brasil',
    supported: false,
    notes: 'Fonte plugável fora do IBGE.',
  },
  {
    slug: 'demographic_density',
    label: 'Densidade demográfica (planejado)',
    unit: 'hab/km²',
    source: 'IBGE',
    supported: false,
  },
  {
    slug: 'crime_rate',
    label: 'Taxa de criminalidade (alternativo)',
    unit: 'ocorrências/100 mil',
    source: 'SENASP / Atlas da Violência / Secretarias Estaduais',
    supported: false,
    notes: 'Plugin externo mantendo o IBGE como backbone territorial.',
  },
];

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, 'IBGE_REQUEST_FAILED', 'Falha ao consultar IBGE.', { url });
  }

  return (await response.json()) as T;
};

const normalizeMunicipioParent = (item: Record<string, unknown>): string | null => {
  const immediate = item['regiao-imediata'] as Record<string, unknown> | undefined;
  const intermediate = immediate?.['regiao-intermediaria'] as Record<string, unknown> | undefined;
  const ufFromNew = intermediate?.['UF'] as Record<string, unknown> | undefined;

  if (ufFromNew?.id) {
    return String(ufFromNew.id);
  }

  const micro = item.microrregiao as Record<string, unknown> | undefined;
  const meso = micro?.mesorregiao as Record<string, unknown> | undefined;
  const ufFromOld = meso?.UF as Record<string, unknown> | undefined;

  if (ufFromOld?.id) {
    return String(ufFromOld.id);
  }

  return null;
};

export const fetchTerritories = async (level: TerritoryLevel, parentCode?: string): Promise<TerritoryItem[]> => {
  let url: string;

  switch (level) {
    case 'REGIAO':
      url = `${LOCALIDADES_BASE}/regioes`;
      break;
    case 'UF':
      url = parentCode ? `${LOCALIDADES_BASE}/regioes/${parentCode}/estados` : `${LOCALIDADES_BASE}/estados`;
      break;
    case 'MUNICIPIO':
      url = parentCode ? `${LOCALIDADES_BASE}/estados/${parentCode}/municipios` : `${LOCALIDADES_BASE}/municipios`;
      break;
    default:
      throw new ApiError(400, 'INVALID_LEVEL', 'Nível territorial inválido.');
  }

  const payload = await fetchJson<Array<Record<string, unknown>>>(url);

  return payload.map((item) => {
    if (level === 'REGIAO') {
      return {
        code: String(item.id),
        name: String(item.nome),
        level,
        parentCode: 'BR',
      };
    }

    if (level === 'UF') {
      const regiao = item.regiao as Record<string, unknown> | undefined;
      return {
        code: String(item.id),
        name: String(item.nome),
        level,
        parentCode: regiao?.id ? String(regiao.id) : null,
        uf: item.sigla ? String(item.sigla) : null,
      };
    }

    return {
      code: String(item.id),
      name: String(item.nome),
      level,
      parentCode: normalizeMunicipioParent(item),
      uf: null,
    };
  });
};

const levelToLocalidade = (level: TerritoryLevel, code?: string): string => {
  if (level === 'REGIAO') {
    return code ? `N2[${code}]` : 'N2[all]';
  }

  if (level === 'UF') {
    return code ? `N3[${code}]` : 'N3[all]';
  }

  if (!code) {
    return 'N6[all]';
  }

  return code.length <= 2 ? 'N6[all]' : `N6[${code}]`;
};

export const fetchPopulation = async (
  level: TerritoryLevel,
  year: number,
  code?: string,
): Promise<IndicatorPoint[]> => {
  const localidade = levelToLocalidade(level, code);
  const url = `${AGREGADOS_BASE}/${POPULATION_AGGREGATE}/periodos/${year}/variaveis/${POPULATION_VARIABLE}?localidades=${localidade}&${POPULATION_CLASSIFICATIONS}`;

  type AggregadosResponse = Array<{
    resultados: Array<{
      series: Array<{
        localidade: {
          id: string;
          nome: string;
        };
        serie: Record<string, string>;
      }>;
    }>;
  }>;

  const payload = await fetchJson<AggregadosResponse>(url);
  const rows = payload[0]?.resultados?.[0]?.series ?? [];

  const parsed = rows
    .map((row) => {
      const rawValue = row.serie[String(year)] ?? Object.values(row.serie)[0] ?? '0';
      return {
        code: row.localidade.id,
        name: row.localidade.nome,
        level,
        year,
        value: Number(rawValue),
      } satisfies IndicatorPoint;
    })
    .filter((row) => Number.isFinite(row.value));

  if (level === 'MUNICIPIO' && code && code.length <= 2) {
    return parsed.filter((row) => row.code.startsWith(code));
  }

  return parsed;
};

export const fetchGeoJson = async (
  level: TerritoryLevel,
  code: string | undefined,
  simplified: boolean,
): Promise<Record<string, unknown>> => {
  const base = `${MALHAS_BASE}`;
  const quality = simplified ? 'minima' : 'intermediaria';
  let url: string;

  if (level === 'REGIAO') {
    url = code && code !== 'BR'
      ? `${base}/regioes/${code}?formato=application/vnd.geo+json&qualidade=${quality}`
      : `${base}/paises/BR?formato=application/vnd.geo+json&qualidade=${quality}&intrarregiao=regiao`;
  } else if (level === 'UF') {
    url = code
      ? `${base}/regioes/${code}?formato=application/vnd.geo+json&qualidade=${quality}&intrarregiao=UF`
      : `${base}/paises/BR?formato=application/vnd.geo+json&qualidade=${quality}&intrarregiao=UF`;
  } else {
    url = code
      ? `${base}/estados/${code}?formato=application/vnd.geo+json&qualidade=${quality}&intrarregiao=municipio`
      : `${base}/paises/BR?formato=application/vnd.geo+json&qualidade=${quality}&intrarregiao=municipio`;
  }

  type GeoJsonFeature = {
    type: 'Feature';
    geometry: unknown;
    properties?: {
      codarea?: string;
      [key: string]: unknown;
    };
  };

  type GeoJsonCollection = {
    type: 'FeatureCollection';
    features: GeoJsonFeature[];
    [key: string]: unknown;
  };

  const payload = await fetchJson<GeoJsonCollection>(url);

  if (!simplified) {
    return payload as Record<string, unknown>;
  }

  return {
    type: payload.type,
    features: payload.features.map((feature) => ({
      type: feature.type,
      geometry: feature.geometry,
      properties: {
        codarea: feature.properties?.codarea ?? null,
      },
    })),
  };
};

