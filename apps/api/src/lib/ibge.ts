import { ApiError } from './errors';
import type {
  CityProfileMetric,
  CityProfilePayload,
  IndicatorDefinition,
  IndicatorPoint,
  IndicatorSlug,
  TerritoryItem,
  TerritoryLevel,
} from './types';

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

const LITERACY_AGGREGATE = '1699';
const LITERACY_RATE_VARIABLE = '1646';
const LITERACY_CLASSIFICATIONS = 'classificacao=2[6794]';

const SANITATION_AGGREGATE = '3154';
const SANITATION_SEWER_RATE_VARIABLE = '1000096';
const SANITATION_CLASSIFICATIONS = 'classificacao=299[10941]';

const HOUSING_INFRA_AGGREGATE = '3157';
const HOUSING_INFRA_PERCENT_VARIABLE = '1000096';
const WATER_NETWORK_CLASSIFICATIONS = 'classificacao=61[10970]';
const GARBAGE_COLLECTION_CLASSIFICATIONS = 'classificacao=67[2520]';
const ELECTRICITY_ACCESS_CLASSIFICATIONS = 'classificacao=309[3011]';

const SCHOOL_ATTENDANCE_AGGREGATE = '10056';
const SCHOOL_ATTENDANCE_VARIABLE = '3795';
const SCHOOL_ATTENDANCE_CLASSIFICATIONS = 'classificacao=58[95253]|2[6794]|86[95251]';

const HIGHER_EDUCATION_AGGREGATE = '10061';
const HIGHER_EDUCATION_VARIABLE = '1002667';
const HIGHER_EDUCATION_CLASSIFICATIONS = 'classificacao=1568[99713]|58[95253]|2[6794]|86[95251]';

const INTERNET_ACCESS_AGGREGATE = '10201';
const INTERNET_ACCESS_VARIABLE = '1013436';
const INTERNET_ACCESS_CLASSIFICATIONS = 'classificacao=2072[77585]|133[95278]';

const GINI_AGGREGATE = '10301';
const GINI_VARIABLE = '13418';

const EXTREME_POVERTY_AGGREGATE = '5877';
const EXTREME_POVERTY_VARIABLE = '9948';

const UNEMPLOYMENT_AGGREGATE = '9694';
const UNEMPLOYMENT_VARIABLE = '10004';
const UNEMPLOYMENT_CLASSIFICATIONS = 'classificacao=2[6794]';

const INFANT_MORTALITY_AGGREGATE = '3834';
const INFANT_MORTALITY_VARIABLE = '1940';

const LIFE_EXPECTANCY_AGGREGATE = '1174';
const LIFE_EXPECTANCY_VARIABLE = '2503';

const PRENATAL_AGGREGATE = '5811';
const PRENATAL_VARIABLE = '6639';
const PRENATAL_CLASSIFICATIONS = 'classificacao=86[95251]|1[6795]';

const PRIMARY_CARE_AGGREGATE = '7631';
const PRIMARY_CARE_VARIABLE = '10954';
const PRIMARY_CARE_CLASSIFICATIONS = 'classificacao=416[10244]';

const HOMICIDE_AGGREGATE = '6606';
const HOMICIDE_RATE_VARIABLE = '13532';

const TRAFFIC_MORTALITY_AGGREGATE = '4408';
const TRAFFIC_MORTALITY_VARIABLE = '9734';
const TRAFFIC_MORTALITY_CLASSIFICATIONS = 'classificacao=2[6794]|58[95253]';

const ROBBERY_AGGREGATE = '8502';
const ROBBERY_COUNT_VARIABLE = '12452';
const ROBBERY_CLASSIFICATIONS = 'classificacao=1351[57304]';

const ROBBERY_HOUSEHOLD_AGGREGATE = '8512';
const ROBBERY_HOUSEHOLD_COUNT_VARIABLE = '12462';
const ROBBERY_HOUSEHOLD_CLASSIFICATIONS = 'classificacao=1351[57304]';

const AGING_INDEX_AGGREGATE = '9515';
const AGING_INDEX_VARIABLE = '10612';

const FERTILITY_AGGREGATE = '3727';
const FERTILITY_VARIABLE = '2493';

const SOURCE_URLS = {
  ibge: 'https://servicodados.ibge.gov.br/api/docs/',
  govbrConecta: 'https://www.gov.br/conecta/catalogo/apis/api-portal-de-dados-abertos',
  dadosGovBr: 'https://dados.gov.br',
  apiSegurancaTerceiros: 'https://github.com/rayonnunes/api_seguranca_publica',
  dadosAbertosSP: 'https://dadosabertos.sp.gov.br',
  atlasViolencia: 'https://www.ipea.gov.br/atlasviolencia/',
  dataViva: 'https://dataviva.info',
  brasilApi: 'https://brasilapi.com.br',
} as const;

export const INDICATORS: IndicatorDefinition[] = [
  {
    slug: 'population',
    label: 'Populacao residente (IBGE)',
    unit: 'pessoas',
    source: 'IBGE Censo Demografico (agregado 10211, variavel 93)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2022,
    yearMax: 2022,
    defaultYear: 2022,
  },
  {
    slug: 'gdp',
    label: 'PIB a precos correntes (IBGE)',
    unit: 'mil reais',
    source: 'IBGE PIB dos Municipios (agregado 5938, variavel 37)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2002,
    yearMax: 2023,
    defaultYear: 2023,
  },
  {
    slug: 'demographic_density',
    label: 'Densidade demografica (IBGE)',
    unit: 'hab/km2',
    source: 'IBGE Censo Demografico (agregado 1301, variavel 616)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2010,
    yearMax: 2010,
    defaultYear: 2010,
  },
  {
    slug: 'literacy_rate',
    label: 'Taxa de alfabetizacao (IBGE)',
    unit: '%',
    source: 'IBGE Censo Demografico (agregado 1699, variavel 1646, classificacao 2[6794])',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2010,
    yearMax: 2010,
    defaultYear: 2010,
  },
  {
    slug: 'sewer_network_coverage',
    label: 'Cobertura de rede de esgoto (IBGE)',
    unit: '%',
    source: 'IBGE Saneamento (agregado 3154, variavel 1000096, classificacao 299[10941])',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2010,
    yearMax: 2010,
    defaultYear: 2010,
  },
  {
    slug: 'territory_area',
    label: 'Area territorial (IBGE/BrasilAPI)',
    unit: 'km2',
    source: 'IBGE Censo Demografico (agregado 1301, variavel 615)',
    sourceLabel: 'IBGE API + BrasilAPI (auxiliar territorial)',
    sourceUrl: SOURCE_URLS.brasilApi,
    supported: true,
    yearMin: 2010,
    yearMax: 2010,
    defaultYear: 2010,
  },
  {
    slug: 'idh',
    label: 'IDH aproximado (proxy IBGE)',
    unit: 'indice',
    source: 'Composto proxy com taxa de alfabetizacao, renda per capita e expectativa de vida (IBGE), inspirado na estrutura do IDH',
    sourceLabel: 'IBGE API (proxy composto)',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2022,
    yearMax: 2022,
    defaultYear: 2022,
    notes: 'Valor aproximado para leitura territorial rapida. IDH oficial segue no Atlas Brasil/PNUD.',
  },
  {
    slug: 'crime_rate',
    label: 'Taxa de criminalidade (proxy roubos)',
    unit: 'ocorrencias/100 mil',
    source: 'IBGE PNAD (agregado 8502, vitimas de roubo) normalizado por populacao; conector SINESP permanece plugavel',
    sourceLabel: 'IBGE API + SINESP (plugavel)',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2021,
    yearMax: 2021,
    defaultYear: 2021,
    notes: `Referencia complementar SINESP/SENASP via ${SOURCE_URLS.govbrConecta}.`,
  },
  {
    slug: 'income_per_capita',
    label: 'Renda per capita (derivada)',
    unit: 'reais',
    source: 'Derivada de PIB municipal (agregado 5938) e populacao residente (agregado 10211)',
    sourceLabel: 'IBGE API (derivada)',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2023,
    yearMax: 2023,
    defaultYear: 2023,
    notes: 'Calculo: (PIB em mil reais * 1000) / populacao.',
  },
  {
    slug: 'unemployment_rate',
    label: 'Taxa de desocupacao (IBGE)',
    unit: '%',
    source: 'IBGE ODS (agregado 9694, variavel 10004)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2012,
    yearMax: 2024,
    defaultYear: 2024,
  },
  {
    slug: 'gini_index',
    label: 'Indice de Gini (IBGE)',
    unit: 'indice',
    source: 'IBGE Censo Demografico (agregado 10301, variavel 13418)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2022,
    yearMax: 2022,
    defaultYear: 2022,
    notes: 'Disponibilidade territorial na API: Brasil, regiao e UF.',
  },
  {
    slug: 'extreme_poverty_rate',
    label: 'Taxa de extrema pobreza',
    unit: '%',
    source: 'IBGE ODS (agregado 5877, variavel 9948)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2012,
    yearMax: 2024,
    defaultYear: 2024,
    notes: 'Disponibilidade territorial na API: Brasil, regiao e UF.',
  },
  {
    slug: 'school_attendance_rate',
    label: 'Taxa de frequencia escolar (IBGE)',
    unit: '%',
    source: 'IBGE Censo Demografico (agregado 10056, variavel 3795)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2022,
    yearMax: 2022,
    defaultYear: 2022,
  },
  {
    slug: 'higher_education_rate',
    label: 'Ensino superior completo (IBGE)',
    unit: '%',
    source: 'IBGE Censo Demografico (agregado 10061, variavel 1002667, classificacao superior completo)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2022,
    yearMax: 2022,
    defaultYear: 2022,
  },
  {
    slug: 'infant_mortality_rate',
    label: 'Mortalidade infantil (IBGE)',
    unit: 'obitos por mil nascidos vivos',
    source: 'IBGE IDS (agregado 3834, variavel 1940)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2000,
    yearMax: 2016,
    defaultYear: 2016,
    notes: 'Disponibilidade territorial na API: Brasil, regiao e UF.',
  },
  {
    slug: 'life_expectancy',
    label: 'Expectativa de vida (IBGE)',
    unit: 'anos',
    source: 'IBGE IDS (agregado 1174, variavel 2503)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2000,
    yearMax: 2014,
    defaultYear: 2014,
    notes: 'Disponibilidade territorial na API: Brasil, regiao e UF.',
  },
  {
    slug: 'prenatal_coverage',
    label: 'Cobertura de pre-natal (IBGE)',
    unit: '%',
    source: 'IBGE PNS (agregado 5811, variavel 6639)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2013,
    yearMax: 2013,
    defaultYear: 2013,
    notes: 'Disponibilidade territorial na API: Brasil e regiao.',
  },
  {
    slug: 'primary_care_coverage',
    label: 'Cobertura de atencao primaria (IBGE)',
    unit: '%',
    source: 'IBGE PNS (agregado 7631, variavel 10954, cadastrados em unidade de saude da familia)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2019,
    yearMax: 2019,
    defaultYear: 2019,
    notes: 'Disponibilidade territorial na API: Brasil e regiao.',
  },
  {
    slug: 'water_network_coverage',
    label: 'Cobertura de agua encanada (IBGE)',
    unit: '%',
    source: 'IBGE Censo Demografico (agregado 3157, variavel 1000096, classificacao 61[10970])',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2010,
    yearMax: 2010,
    defaultYear: 2010,
  },
  {
    slug: 'garbage_collection_coverage',
    label: 'Cobertura de coleta de lixo (IBGE)',
    unit: '%',
    source: 'IBGE Censo Demografico (agregado 3157, variavel 1000096, classificacao 67[2520])',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2010,
    yearMax: 2010,
    defaultYear: 2010,
  },
  {
    slug: 'internet_access_rate',
    label: 'Domicilios com acesso a internet (IBGE)',
    unit: '%',
    source: 'IBGE Censo Demografico (agregado 10201, variavel 1013436, conexao domiciliar = sim)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2022,
    yearMax: 2022,
    defaultYear: 2022,
  },
  {
    slug: 'electricity_access_rate',
    label: 'Domicilios com energia eletrica (IBGE)',
    unit: '%',
    source: 'IBGE Censo Demografico (agregado 3157, variavel 1000096, classificacao 309[3011])',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2010,
    yearMax: 2010,
    defaultYear: 2010,
  },
  {
    slug: 'homicide_rate',
    label: 'Homicidios (IBGE ODS)',
    unit: 'obitos/100 mil',
    source: 'IBGE ODS (agregado 6606, variavel 13532)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2000,
    yearMax: 2023,
    defaultYear: 2023,
    notes: 'Disponibilidade territorial na API: Brasil, regiao e UF.',
  },
  {
    slug: 'robbery_rate',
    label: 'Roubos (proxy domicilios vitimizados)',
    unit: 'ocorrencias/100 mil',
    source: 'IBGE PNAD (agregado 8512, domicilios com vitima de roubo) normalizado por populacao',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2021,
    yearMax: 2021,
    defaultYear: 2021,
    notes: `Conector oficial estadual/SINESP segue opcional via ${SOURCE_URLS.dadosGovBr}.`,
  },
  {
    slug: 'traffic_mortality_rate',
    label: 'Mortalidade no transito (IBGE ODS)',
    unit: 'obitos/100 mil',
    source: 'IBGE ODS (agregado 4408, variavel 9734)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2000,
    yearMax: 2023,
    defaultYear: 2023,
    notes: 'Disponibilidade territorial na API: Brasil, regiao e UF.',
  },
  {
    slug: 'aging_index',
    label: 'Indice de envelhecimento (IBGE)',
    unit: 'indice',
    source: 'IBGE Censo Demografico (agregado 9515, variavel 10612)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2022,
    yearMax: 2022,
    defaultYear: 2022,
  },
  {
    slug: 'fertility_rate',
    label: 'Taxa de fecundidade (IBGE)',
    unit: 'filhos por mulher',
    source: 'IBGE IDS (agregado 3727, variavel 2493)',
    sourceLabel: 'IBGE API',
    sourceUrl: SOURCE_URLS.ibge,
    supported: true,
    yearMin: 2000,
    yearMax: 2016,
    defaultYear: 2016,
    notes: 'Disponibilidade territorial na API: Brasil, regiao e UF.',
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
  const text = String(raw ?? '').trim();
  if (!text) return Number.NaN;

  let normalized = text;

  if (text.includes(',') && text.includes('.')) {
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      normalized = text.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = text.replace(/,/g, '');
    }
  } else if (text.includes(',')) {
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = text.replace(/,/g, '');
  }

  normalized = normalized.replace(/[^0-9.-]/g, '');
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

const clampNumeric = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const getMunicipalityScope = async (code?: string): Promise<TerritoryItem[]> => {
  if (code && code.length >= 2) {
    const ufCode = code.slice(0, 2);
    const fromUf = await fetchTerritories('MUNICIPIO', ufCode);
    if (code.length === 7) {
      return fromUf.filter((item) => item.code === code);
    }
    return fromUf;
  }

  return fetchTerritories('MUNICIPIO');
};

const expandUfPointsToMunicipios = async (
  ufPoints: IndicatorPoint[],
  year: number,
  code?: string,
): Promise<IndicatorPoint[]> => {
  const ufMap = new Map(ufPoints.map((item) => [item.code, item]));
  const municipios = await getMunicipalityScope(code);

  return municipios
    .map((municipio) => {
      const ufCode = municipio.parentCode ?? municipio.code.slice(0, 2);
      const ufRow = ufMap.get(ufCode);
      if (!ufRow) return null;

      return {
        code: municipio.code,
        name: municipio.name,
        level: 'MUNICIPIO',
        year,
        value: ufRow.value,
      } satisfies IndicatorPoint;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
};

const expandRegiaoPointsToUfs = async (
  regiaoPoints: IndicatorPoint[],
  year: number,
  code?: string,
): Promise<IndicatorPoint[]> => {
  const regiaoMap = new Map(regiaoPoints.map((item) => [item.code, item]));
  const ufs = await fetchTerritories('UF');

  return ufs
    .filter((uf) => {
      if (!code) return true;
      if (code.length === 1) return uf.parentCode === code;
      if (code.length === 2) return uf.code === code;
      return true;
    })
    .map((uf) => {
      const regiaoCode = uf.parentCode ?? '';
      const regiaoRow = regiaoMap.get(regiaoCode);
      if (!regiaoRow) return null;

      return {
        code: uf.code,
        name: uf.name,
        level: 'UF',
        year,
        value: regiaoRow.value,
      } satisfies IndicatorPoint;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
};

const expandRegiaoPointsToMunicipios = async (
  regiaoPoints: IndicatorPoint[],
  year: number,
  code?: string,
): Promise<IndicatorPoint[]> => {
  const regiaoMap = new Map(regiaoPoints.map((item) => [item.code, item]));
  const ufs = await fetchTerritories('UF');
  const ufToRegiao = new Map(ufs.map((uf) => [uf.code, uf.parentCode ?? '']));
  const municipios = await getMunicipalityScope(code);

  return municipios
    .map((municipio) => {
      const ufCode = municipio.parentCode ?? municipio.code.slice(0, 2);
      const regiaoCode = ufToRegiao.get(ufCode);
      if (!regiaoCode) return null;

      const regiaoRow = regiaoMap.get(regiaoCode);
      if (!regiaoRow) return null;

      return {
        code: municipio.code,
        name: municipio.name,
        level: 'MUNICIPIO',
        year,
        value: regiaoRow.value,
      } satisfies IndicatorPoint;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
};

const fetchUfNativeWithMunicipioExpansion = async (
  level: TerritoryLevel,
  year: number,
  code: string | undefined,
  aggregateId: string,
  variableId: string,
  classificationQuery?: string,
): Promise<IndicatorPoint[]> => {
  if (level !== 'MUNICIPIO') {
    return fetchAggregateSeries({ level, year, code, aggregateId, variableId, classificationQuery });
  }

  const ufCode = code && code.length >= 2 ? code.slice(0, 2) : undefined;
  const ufPoints = await fetchAggregateSeries({
    level: 'UF',
    year,
    code: ufCode,
    aggregateId,
    variableId,
    classificationQuery,
  });

  return expandUfPointsToMunicipios(ufPoints, year, code);
};

const fetchRegiaoNativeWithExpansion = async (
  level: TerritoryLevel,
  year: number,
  code: string | undefined,
  aggregateId: string,
  variableId: string,
  classificationQuery?: string,
): Promise<IndicatorPoint[]> => {
  const regiaoPoints = await fetchAggregateSeries({
    level: 'REGIAO',
    year,
    aggregateId,
    variableId,
    classificationQuery,
  });

  if (level === 'REGIAO') {
    if (!code || code.length !== 1) return regiaoPoints;
    return regiaoPoints.filter((row) => row.code === code);
  }

  if (level === 'UF') {
    return expandRegiaoPointsToUfs(regiaoPoints, year, code);
  }

  return expandRegiaoPointsToMunicipios(regiaoPoints, year, code);
};

const normalizeCountByPopulation = async (
  countPoints: IndicatorPoint[],
  level: TerritoryLevel,
  code: string | undefined,
  populationYear = 2022,
): Promise<IndicatorPoint[]> => {
  const populationPoints = await fetchAggregateSeries({
    level,
    year: populationYear,
    code,
    aggregateId: POPULATION_AGGREGATE,
    variableId: POPULATION_VARIABLE,
    classificationQuery: POPULATION_CLASSIFICATIONS,
  });

  const populationMap = new Map(populationPoints.map((item) => [item.code, item.value]));

  return countPoints
    .map((item) => {
      const population = populationMap.get(item.code);
      if (!population || population <= 0) return null;

      return {
        ...item,
        value: (item.value / population) * 100_000,
      } satisfies IndicatorPoint;
    })
    .filter((item): item is IndicatorPoint => item !== null);
};

const fetchIncomePerCapitaDerived = async (
  level: TerritoryLevel,
  code: string | undefined,
): Promise<IndicatorPoint[]> => {
  const [gdpRows, populationRows] = await Promise.all([
    fetchAggregateSeries({
      level,
      year: 2023,
      code,
      aggregateId: GDP_AGGREGATE,
      variableId: GDP_VARIABLE,
    }),
    fetchAggregateSeries({
      level,
      year: 2022,
      code,
      aggregateId: POPULATION_AGGREGATE,
      variableId: POPULATION_VARIABLE,
      classificationQuery: POPULATION_CLASSIFICATIONS,
    }),
  ]);

  const popMap = new Map(populationRows.map((item) => [item.code, item.value]));

  return gdpRows
    .map((item) => {
      const population = popMap.get(item.code);
      if (!population || population <= 0) return null;

      return {
        code: item.code,
        name: item.name,
        level: item.level,
        year: 2023,
        value: (item.value * 1000) / population,
      } satisfies IndicatorPoint;
    })
    .filter((item): item is IndicatorPoint => item !== null);
};

const fetchIdhProxy = async (level: TerritoryLevel, code?: string): Promise<IndicatorPoint[]> => {
  const [literacyRows, incomeRows, lifeRows] = await Promise.all([
    fetchAggregateSeries({
      level,
      year: 2010,
      code,
      aggregateId: LITERACY_AGGREGATE,
      variableId: LITERACY_RATE_VARIABLE,
      classificationQuery: LITERACY_CLASSIFICATIONS,
    }),
    fetchIncomePerCapitaDerived(level, code),
    level === 'MUNICIPIO'
      ? (async () => {
          const ufCode = code && code.length >= 2 ? code.slice(0, 2) : undefined;
          const ufLife = await fetchAggregateSeries({
            level: 'UF',
            year: 2014,
            code: ufCode,
            aggregateId: LIFE_EXPECTANCY_AGGREGATE,
            variableId: LIFE_EXPECTANCY_VARIABLE,
          });
          return expandUfPointsToMunicipios(ufLife, 2014, code);
        })()
      : fetchAggregateSeries({
          level,
          year: 2014,
          code,
          aggregateId: LIFE_EXPECTANCY_AGGREGATE,
          variableId: LIFE_EXPECTANCY_VARIABLE,
        }),
  ]);

  const literacyMap = new Map(literacyRows.map((item) => [item.code, item]));
  const lifeMap = new Map(lifeRows.map((item) => [item.code, item]));
  const incomeValues = incomeRows.map((item) => item.value).filter(Number.isFinite);
  const minIncome = incomeValues.length ? Math.min(...incomeValues) : 0;
  const maxIncome = incomeValues.length ? Math.max(...incomeValues) : 1;
  const incomeSpan = maxIncome - minIncome;

  return incomeRows
    .map((income) => {
      const literacy = literacyMap.get(income.code);
      const life = lifeMap.get(income.code);
      if (!literacy || !life) return null;

      const educationDim = clampNumeric(literacy.value / 100, 0, 1);
      const incomeDim = incomeSpan > 0 ? clampNumeric((income.value - minIncome) / incomeSpan, 0, 1) : 0.5;
      const longevityDim = clampNumeric((life.value - 50) / 35, 0, 1);

      return {
        code: income.code,
        name: income.name,
        level: income.level,
        year: 2022,
        value: (educationDim + incomeDim + longevityDim) / 3,
      } satisfies IndicatorPoint;
    })
    .filter((item): item is IndicatorPoint => item !== null);
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
    case 'literacy_rate':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: LITERACY_AGGREGATE,
        variableId: LITERACY_RATE_VARIABLE,
        classificationQuery: LITERACY_CLASSIFICATIONS,
      });
    case 'sewer_network_coverage':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: SANITATION_AGGREGATE,
        variableId: SANITATION_SEWER_RATE_VARIABLE,
        classificationQuery: SANITATION_CLASSIFICATIONS,
      });
    case 'water_network_coverage':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: HOUSING_INFRA_AGGREGATE,
        variableId: HOUSING_INFRA_PERCENT_VARIABLE,
        classificationQuery: WATER_NETWORK_CLASSIFICATIONS,
      });
    case 'garbage_collection_coverage':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: HOUSING_INFRA_AGGREGATE,
        variableId: HOUSING_INFRA_PERCENT_VARIABLE,
        classificationQuery: GARBAGE_COLLECTION_CLASSIFICATIONS,
      });
    case 'electricity_access_rate':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: HOUSING_INFRA_AGGREGATE,
        variableId: HOUSING_INFRA_PERCENT_VARIABLE,
        classificationQuery: ELECTRICITY_ACCESS_CLASSIFICATIONS,
      });
    case 'territory_area':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: TERRITORY_AGGREGATE,
        variableId: TERRITORY_AREA_VARIABLE,
      });
    case 'income_per_capita':
      return fetchIncomePerCapitaDerived(level, code);
    case 'school_attendance_rate':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: SCHOOL_ATTENDANCE_AGGREGATE,
        variableId: SCHOOL_ATTENDANCE_VARIABLE,
        classificationQuery: SCHOOL_ATTENDANCE_CLASSIFICATIONS,
      });
    case 'higher_education_rate':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: HIGHER_EDUCATION_AGGREGATE,
        variableId: HIGHER_EDUCATION_VARIABLE,
        classificationQuery: HIGHER_EDUCATION_CLASSIFICATIONS,
      });
    case 'internet_access_rate':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: INTERNET_ACCESS_AGGREGATE,
        variableId: INTERNET_ACCESS_VARIABLE,
        classificationQuery: INTERNET_ACCESS_CLASSIFICATIONS,
      });
    case 'aging_index':
      return fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: AGING_INDEX_AGGREGATE,
        variableId: AGING_INDEX_VARIABLE,
      });
    case 'unemployment_rate':
      return fetchUfNativeWithMunicipioExpansion(
        level,
        year,
        code,
        UNEMPLOYMENT_AGGREGATE,
        UNEMPLOYMENT_VARIABLE,
        UNEMPLOYMENT_CLASSIFICATIONS,
      );
    case 'gini_index':
      return fetchUfNativeWithMunicipioExpansion(level, year, code, GINI_AGGREGATE, GINI_VARIABLE);
    case 'extreme_poverty_rate':
      return fetchUfNativeWithMunicipioExpansion(
        level,
        year,
        code,
        EXTREME_POVERTY_AGGREGATE,
        EXTREME_POVERTY_VARIABLE,
      );
    case 'infant_mortality_rate':
      return fetchUfNativeWithMunicipioExpansion(
        level,
        year,
        code,
        INFANT_MORTALITY_AGGREGATE,
        INFANT_MORTALITY_VARIABLE,
      );
    case 'life_expectancy':
      return fetchUfNativeWithMunicipioExpansion(
        level,
        year,
        code,
        LIFE_EXPECTANCY_AGGREGATE,
        LIFE_EXPECTANCY_VARIABLE,
      );
    case 'homicide_rate':
      return fetchUfNativeWithMunicipioExpansion(level, year, code, HOMICIDE_AGGREGATE, HOMICIDE_RATE_VARIABLE);
    case 'traffic_mortality_rate':
      return fetchUfNativeWithMunicipioExpansion(
        level,
        year,
        code,
        TRAFFIC_MORTALITY_AGGREGATE,
        TRAFFIC_MORTALITY_VARIABLE,
        TRAFFIC_MORTALITY_CLASSIFICATIONS,
      );
    case 'fertility_rate':
      return fetchUfNativeWithMunicipioExpansion(level, year, code, FERTILITY_AGGREGATE, FERTILITY_VARIABLE);
    case 'prenatal_coverage':
      return fetchRegiaoNativeWithExpansion(
        level,
        year,
        code,
        PRENATAL_AGGREGATE,
        PRENATAL_VARIABLE,
        PRENATAL_CLASSIFICATIONS,
      );
    case 'primary_care_coverage':
      return fetchRegiaoNativeWithExpansion(
        level,
        year,
        code,
        PRIMARY_CARE_AGGREGATE,
        PRIMARY_CARE_VARIABLE,
        PRIMARY_CARE_CLASSIFICATIONS,
      );
    case 'crime_rate': {
      if (level === 'MUNICIPIO') {
        const ufCode = code && code.length >= 2 ? code.slice(0, 2) : undefined;
        const ufRows = await fetchAggregateSeries({
          level: 'UF',
          year,
          code: ufCode,
          aggregateId: ROBBERY_AGGREGATE,
          variableId: ROBBERY_COUNT_VARIABLE,
          classificationQuery: ROBBERY_CLASSIFICATIONS,
        });
        const normalizedUfRows = await normalizeCountByPopulation(ufRows, 'UF', ufCode);
        return expandUfPointsToMunicipios(normalizedUfRows, year, code);
      }

      const rows = await fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: ROBBERY_AGGREGATE,
        variableId: ROBBERY_COUNT_VARIABLE,
        classificationQuery: ROBBERY_CLASSIFICATIONS,
      });
      return normalizeCountByPopulation(rows, level, code);
    }
    case 'robbery_rate': {
      if (level === 'MUNICIPIO') {
        const ufCode = code && code.length >= 2 ? code.slice(0, 2) : undefined;
        const ufRows = await fetchAggregateSeries({
          level: 'UF',
          year,
          code: ufCode,
          aggregateId: ROBBERY_HOUSEHOLD_AGGREGATE,
          variableId: ROBBERY_HOUSEHOLD_COUNT_VARIABLE,
          classificationQuery: ROBBERY_HOUSEHOLD_CLASSIFICATIONS,
        });
        const normalizedUfRows = await normalizeCountByPopulation(ufRows, 'UF', ufCode);
        return expandUfPointsToMunicipios(normalizedUfRows, year, code);
      }

      const rows = await fetchAggregateSeries({
        level,
        year,
        code,
        aggregateId: ROBBERY_HOUSEHOLD_AGGREGATE,
        variableId: ROBBERY_HOUSEHOLD_COUNT_VARIABLE,
        classificationQuery: ROBBERY_HOUSEHOLD_CLASSIFICATIONS,
      });
      return normalizeCountByPopulation(rows, level, code);
    }
    case 'idh':
      return fetchIdhProxy(level, code);
    default:
      throw new ApiError(
        501,
        'INDICATOR_NOT_IMPLEMENTED',
        'Indicador ainda nao implementado no MVP. Fonte alternativa segue plugavel.',
        { indicator },
      );
  }
};

const buildMetric = (
  metric: Omit<CityProfileMetric, 'status'> & { value: number | null; status?: CityProfileMetric['status'] },
): CityProfileMetric => {
  return {
    ...metric,
    status: metric.status ?? (metric.value === null ? 'unavailable' : 'ok'),
  };
};

const safeFirstPoint = async (producer: () => Promise<IndicatorPoint[]>): Promise<IndicatorPoint | null> => {
  try {
    const rows = await producer();
    return rows[0] ?? null;
  } catch {
    return null;
  }
};

export const fetchCityProfile = async (cityCode: string): Promise<CityProfilePayload> => {
  if (!/^\d{7}$/.test(cityCode)) {
    throw new ApiError(400, 'INVALID_CITY_CODE', 'cityCode deve ser um codigo IBGE de municipio (7 digitos).');
  }

  const ufCode = cityCode.slice(0, 2);

  const [population, gdp, density, area, literacyRate, sewerCoverage, ufHomicideRate, ufTrafficRate, crimeRate] =
    await Promise.all([
      safeFirstPoint(() => fetchIndicatorData('population', 'MUNICIPIO', 2022, cityCode)),
      safeFirstPoint(() => fetchIndicatorData('gdp', 'MUNICIPIO', 2023, cityCode)),
      safeFirstPoint(() => fetchIndicatorData('demographic_density', 'MUNICIPIO', 2010, cityCode)),
      safeFirstPoint(() => fetchIndicatorData('territory_area', 'MUNICIPIO', 2010, cityCode)),
      safeFirstPoint(() =>
        fetchAggregateSeries({
          level: 'MUNICIPIO',
          year: 2010,
          code: cityCode,
          aggregateId: LITERACY_AGGREGATE,
          variableId: LITERACY_RATE_VARIABLE,
          classificationQuery: LITERACY_CLASSIFICATIONS,
        }),
      ),
      safeFirstPoint(() =>
        fetchAggregateSeries({
          level: 'MUNICIPIO',
          year: 2010,
          code: cityCode,
          aggregateId: SANITATION_AGGREGATE,
          variableId: SANITATION_SEWER_RATE_VARIABLE,
          classificationQuery: SANITATION_CLASSIFICATIONS,
        }),
      ),
      safeFirstPoint(() =>
        fetchIndicatorData('homicide_rate', 'UF', 2023, ufCode),
      ),
      safeFirstPoint(() =>
        fetchIndicatorData('traffic_mortality_rate', 'UF', 2023, ufCode),
      ),
      safeFirstPoint(() => fetchIndicatorData('crime_rate', 'MUNICIPIO', 2021, cityCode)),
    ]);

  const cityName = population?.name ?? gdp?.name ?? density?.name ?? `Municipio ${cityCode}`;
  const gdpPerCapita =
    population && gdp && population.value > 0 ? (gdp.value * 1000) / population.value : null;

  const metrics: CityProfileMetric[] = [
    buildMetric({
      key: 'population',
      label: 'Populacao residente',
      category: 'demografia',
      source: 'IBGE API (agregado 10211/93)',
      unit: 'pessoas',
      year: 2022,
      value: population?.value ?? null,
    }),
    buildMetric({
      key: 'gdp',
      label: 'PIB a precos correntes',
      category: 'economia',
      source: 'IBGE API (agregado 5938/37)',
      unit: 'mil reais',
      year: 2023,
      value: gdp?.value ?? null,
    }),
    buildMetric({
      key: 'gdp_per_capita',
      label: 'PIB per capita',
      category: 'economia',
      source: 'Derivado de indicadores IBGE',
      unit: 'reais',
      year: 2023,
      value: gdpPerCapita,
    }),
    buildMetric({
      key: 'demographic_density',
      label: 'Densidade demografica',
      category: 'demografia',
      source: 'IBGE API (agregado 1301/616)',
      unit: 'hab/km2',
      year: 2010,
      value: density?.value ?? null,
    }),
    buildMetric({
      key: 'territory_area',
      label: 'Area territorial',
      category: 'demografia',
      source: 'IBGE API (agregado 1301/615)',
      unit: 'km2',
      year: 2010,
      value: area?.value ?? null,
    }),
    buildMetric({
      key: 'literacy_rate',
      label: 'Taxa de alfabetizacao',
      category: 'educacao',
      source: 'IBGE API (agregado 1699/1646)',
      unit: '%',
      year: 2010,
      value: literacyRate?.value ?? null,
    }),
    buildMetric({
      key: 'sewer_network_coverage',
      label: 'Cobertura de esgoto em rede geral',
      category: 'saude',
      source: 'IBGE API (agregado 3154/1000096)',
      unit: '%',
      year: 2010,
      value: sewerCoverage?.value ?? null,
    }),
    buildMetric({
      key: 'homicide_rate_uf_proxy',
      label: 'Homicidios (taxa por 100 mil, UF)',
      category: 'seguranca',
      source: 'IBGE API (agregado 6606/13532)',
      unit: 'obitos/100 mil',
      year: 2023,
      value: ufHomicideRate?.value ?? null,
      status: ufHomicideRate ? 'partial' : 'unavailable',
      notes: 'Disponivel por UF na API; em nivel municipal a aplicacao usa expansao por UF.',
    }),
    buildMetric({
      key: 'traffic_mortality_uf_proxy',
      label: 'Mortalidade no transito (taxa por 100 mil, UF)',
      category: 'saude',
      source: 'IBGE API (agregado 4408/9734)',
      unit: 'obitos/100 mil',
      year: 2023,
      value: ufTrafficRate?.value ?? null,
      status: ufTrafficRate ? 'partial' : 'unavailable',
      notes: 'Disponivel por UF na API; em nivel municipal a aplicacao usa expansao por UF.',
    }),
    buildMetric({
      key: 'crime_rate',
      label: 'Taxa de criminalidade municipal',
      category: 'seguranca',
      source: 'IBGE API (PNAD vitimizacao por roubo, normalizado por populacao)',
      unit: 'ocorrencias/100 mil',
      year: 2021,
      value: crimeRate?.value ?? null,
      status: crimeRate ? 'ok' : 'unavailable',
      notes: 'SINESP/SENASP permanece conector plugavel complementar.',
    }),
  ];

  return {
    cityCode,
    cityName,
    ufCode,
    metrics,
  };
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
