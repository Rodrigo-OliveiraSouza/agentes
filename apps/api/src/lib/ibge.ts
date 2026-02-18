import { ApiError } from './errors';
import type { IndicatorDefinition, IndicatorPoint, IndicatorSlug, TerritoryItem, TerritoryLevel } from './types';

const LOCALIDADES_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const AGREGADOS_BASE = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const MALHAS_BASE = 'https://servicodados.ibge.gov.br/api/v3/malhas';

const POPULATION_AGGREGATE = '10211';
const POPULATION_VARIABLE = '93';
const POPULATION_CLASSIFICATIONS = 'classificacao=1[6795]|2661[32776]';

const GDP_AGGREGATE = '5938';
const GDP_VARIABLE = '37';

const TERRITORY_AGGREGATE = '1301';
const TERRITORY_AREA_VARIABLE = '615';
const DEMOGRAPHIC_DENSITY_VARIABLE = '616';

export const INDICATORS: IndicatorDefinition[] = [
  {
    slug: 'population',
    label: 'Populacao residente',
    unit: 'pessoas',
    source: 'IBGE Censo Demografico (agregado 10211, variavel 93)',
    supported: true,
    yearMin: 2022,
    yearMax: 2022,
    defaultYear: 2022,
  },
  {
    slug: 'gdp',
    label: 'PIB a precos correntes',
    unit: 'mil reais',
    source: 'IBGE PIB dos Municipios (agregado 5938, variavel 37)',
    supported: true,
    yearMin: 2002,
    yearMax: 2023,
    defaultYear: 2023,
  },
  {
    slug: 'demographic_density',
    label: 'Densidade demografica',
    unit: 'hab/km2',
    source: 'IBGE Censo Demografico (agregado 1301, variavel 616)',
    supported: true,
    yearMin: 2010,
    yearMax: 2010,
    defaultYear: 2010,
  },
  {
    slug: 'territory_area',
    label: 'Area territorial',
    unit: 'km2',
    source: 'IBGE Censo Demografico (agregado 1301, variavel 615)',
    supported: true,
    yearMin: 2010,
    yearMax: 2010,
    defaultYear: 2010,
  },
  {
    slug: 'idh',
    label: 'IDH (alternativo)',
    unit: 'indice',
    source: 'PNUD Atlas Brasil',
    supported: false,
    notes: 'Conector plugavel fora do IBGE.',
  },
  {
    slug: 'crime_rate',
    label: 'Taxa de criminalidade (alternativo)',
    unit: 'ocorrencias/100 mil',
    source: 'SENASP / Atlas da Violencia / Secretarias Estaduais',
    supported: false,
    notes: 'Conector plugavel fora do IBGE.',
  },
];

export const INDICATOR_SLUGS = INDICATORS.map((item) => item.slug) as IndicatorSlug[];

export const getIndicatorDefinition = (slug: IndicatorSlug): IndicatorDefinition | undefined => {
  return INDICATORS.find((item) => item.slug === slug);
};

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
  const ufFromNew = intermediate?.UF as Record<string, unknown> | undefined;

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
      throw new ApiError(400, 'INVALID_LEVEL', 'Nivel territorial invalido.');
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

type FetchAggregateParams = {
  level: TerritoryLevel;
  year: number;
  code?: string;
  aggregateId: string;
  variableId: string;
  classificationQuery?: string;
};

const toNumericValue = (raw: string): number => {
  const normalized = String(raw ?? '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  return Number(normalized);
};

const fetchAggregateSeries = async ({
  level,
  year,
  code,
  aggregateId,
  variableId,
  classificationQuery,
}: FetchAggregateParams): Promise<IndicatorPoint[]> => {
  const localidade = levelToLocalidade(level, code);
  const classificationPart = classificationQuery ? `&${classificationQuery}` : '';
  const url = `${AGREGADOS_BASE}/${aggregateId}/periodos/${year}/variaveis/${variableId}?localidades=${localidade}${classificationPart}`;

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
        value: toNumericValue(rawValue),
      } satisfies IndicatorPoint;
    })
    .filter((row) => Number.isFinite(row.value));

  if (level === 'MUNICIPIO' && code && code.length <= 2) {
    return parsed.filter((row) => row.code.startsWith(code));
  }

  return parsed;
};

export const fetchIndicatorData = async (
  indicator: IndicatorSlug,
  level: TerritoryLevel,
  year: number,
  code?: string,
): Promise<IndicatorPoint[]> => {
  switch (indicator) {
    case 'population':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: POPULATION_AGGREGATE,
        variableId: POPULATION_VARIABLE,
        classificationQuery: POPULATION_CLASSIFICATIONS,
      });
    case 'gdp':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: GDP_AGGREGATE,
        variableId: GDP_VARIABLE,
      });
    case 'demographic_density':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: TERRITORY_AGGREGATE,
        variableId: DEMOGRAPHIC_DENSITY_VARIABLE,
      });
    case 'territory_area':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: TERRITORY_AGGREGATE,
        variableId: TERRITORY_AREA_VARIABLE,
      });
    default:
      throw new ApiError(
        501,
        'INDICATOR_NOT_IMPLEMENTED',
        'Indicador ainda nao implementado no MVP. Fonte alternativa segue plugavel.',
        { indicator },
      );
  }
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
