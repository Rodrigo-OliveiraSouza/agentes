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

const CRIME_PROXY_AGGREGATE = '899';
const HOMICIDE_RATE_VARIABLE = '2150';
const TRAFFIC_RATE_VARIABLE = '2151';
const CRIME_CLASSIFICATIONS = 'classificacao=2[6794]';

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
    label: 'IDH (Atlas Brasil/PNUD)',
    unit: 'indice',
    source: 'PNUD Atlas Brasil',
    sourceLabel: 'Atlas Brasil (PNUD)',
    sourceUrl: 'https://www.atlasbrasil.org.br/',
    supported: false,
    notes: 'Conector plugavel fora do IBGE.',
  },
  {
    slug: 'crime_rate',
    label: 'Criminalidade (SINESP)',
    unit: 'ocorrencias/100 mil',
    source: 'SINESP/SENASP com catalogo via gov.br Conecta e datasets do dados.gov.br',
    sourceLabel: 'SINESP (dados.gov.br / gov.br Conecta)',
    sourceUrl: SOURCE_URLS.govbrConecta,
    supported: false,
    notes: `Conector plugavel externo. Origem alternativa direta: ${SOURCE_URLS.dadosGovBr}.`,
  },
  {
    slug: 'income_per_capita',
    label: 'Renda per capita (DataViva)',
    unit: 'reais',
    source: 'DataViva + bases socioeconomicas oficiais',
    sourceLabel: 'DataViva',
    sourceUrl: SOURCE_URLS.dataViva,
    supported: false,
    notes: 'Conector planejado para agregados socioeconomicos.',
  },
  {
    slug: 'unemployment_rate',
    label: 'Taxa de desocupacao (DataViva)',
    unit: '%',
    source: 'DataViva + PNAD/IBGE',
    sourceLabel: 'DataViva',
    sourceUrl: SOURCE_URLS.dataViva,
    supported: false,
    notes: 'Conector planejado para mercado de trabalho.',
  },
  {
    slug: 'gini_index',
    label: 'Indice de Gini (DataViva)',
    unit: 'indice',
    source: 'DataViva + IBGE/SIDRA',
    sourceLabel: 'DataViva',
    sourceUrl: SOURCE_URLS.dataViva,
    supported: false,
    notes: 'Conector planejado para desigualdade de renda.',
  },
  {
    slug: 'extreme_poverty_rate',
    label: 'Taxa de extrema pobreza',
    unit: '%',
    source: 'IBGE/SIDRA (planejado)',
    supported: false,
    notes: 'Conector planejado para vulnerabilidade social.',
  },
  {
    slug: 'school_attendance_rate',
    label: 'Taxa de frequencia escolar',
    unit: '%',
    source: 'IBGE Censo/SIDRA (planejado)',
    supported: false,
    notes: 'Conector planejado para educacao basica.',
  },
  {
    slug: 'higher_education_rate',
    label: 'Ensino superior completo',
    unit: '%',
    source: 'IBGE Censo/SIDRA (planejado)',
    supported: false,
    notes: 'Conector planejado para educacao superior.',
  },
  {
    slug: 'infant_mortality_rate',
    label: 'Mortalidade infantil',
    unit: 'obitos por mil nascidos vivos',
    source: 'IBGE/MinSaude (planejado)',
    supported: false,
    notes: 'Conector planejado com fonte oficial de saude publica.',
  },
  {
    slug: 'life_expectancy',
    label: 'Expectativa de vida',
    unit: 'anos',
    source: 'IBGE (planejado)',
    supported: false,
    notes: 'Conector planejado para indicadores de longevidade.',
  },
  {
    slug: 'prenatal_coverage',
    label: 'Cobertura de pre-natal adequado',
    unit: '%',
    source: 'DataSUS/IBGE (planejado)',
    supported: false,
    notes: 'Conector planejado para saude materna.',
  },
  {
    slug: 'primary_care_coverage',
    label: 'Cobertura de atencao primaria',
    unit: '%',
    source: 'DataSUS e fontes oficiais (planejado)',
    supported: false,
    notes: 'Conector planejado para atencao basica.',
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
    label: 'Domicilios com acesso a internet',
    unit: '%',
    source: 'IBGE TIC/PNAD (planejado)',
    supported: false,
    notes: 'Conector planejado para inclusao digital.',
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
    label: 'Homicidios (Atlas da Violencia)',
    unit: 'obitos/100 mil',
    source: 'Atlas da Violencia (IPEA/FBSP)',
    sourceLabel: 'Atlas da Violencia (IPEA)',
    sourceUrl: SOURCE_URLS.atlasViolencia,
    supported: false,
    notes: 'Conector plugavel externo.',
  },
  {
    slug: 'robbery_rate',
    label: 'Roubos (Portais Estaduais)',
    unit: 'ocorrencias/100 mil',
    source: 'Portais estaduais de dados abertos (ex.: SP) e API comunitaria de seguranca publica',
    sourceLabel: 'Portais estaduais + API de terceiros',
    sourceUrl: SOURCE_URLS.dadosAbertosSP,
    supported: false,
    notes: `Conector plugavel externo. Alternativa tecnica: ${SOURCE_URLS.apiSegurancaTerceiros}.`,
  },
  {
    slug: 'traffic_mortality_rate',
    label: 'Mortalidade no transito',
    unit: 'obitos/100 mil',
    source: 'IBGE/SIM (planejado)',
    supported: false,
    notes: 'Conector planejado para seguranca viaria.',
  },
  {
    slug: 'aging_index',
    label: 'Indice de envelhecimento',
    unit: 'indice',
    source: 'IBGE Censo (planejado)',
    supported: false,
    notes: 'Conector planejado para estrutura etaria.',
  },
  {
    slug: 'fertility_rate',
    label: 'Taxa de fecundidade',
    unit: 'filhos por mulher',
    source: 'IBGE Censo (planejado)',
    supported: false,
    notes: 'Conector planejado para dinamica demografica.',
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

  const [population, gdp, density, area, literacyRate, sewerCoverage, ufHomicideRate, ufTrafficRate] =
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
        fetchAggregateSeries({
          level: 'UF',
          year: 2012,
          code: ufCode,
          aggregateId: CRIME_PROXY_AGGREGATE,
          variableId: HOMICIDE_RATE_VARIABLE,
          classificationQuery: CRIME_CLASSIFICATIONS,
        }),
      ),
      safeFirstPoint(() =>
        fetchAggregateSeries({
          level: 'UF',
          year: 2012,
          code: ufCode,
          aggregateId: CRIME_PROXY_AGGREGATE,
          variableId: TRAFFIC_RATE_VARIABLE,
          classificationQuery: CRIME_CLASSIFICATIONS,
        }),
      ),
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
      label: 'Mortalidade por homicidio (proxy UF)',
      category: 'seguranca',
      source: 'IBGE API (agregado 899/2150, proxy UF)',
      unit: 'obitos/100 mil',
      year: 2012,
      value: ufHomicideRate?.value ?? null,
      status: ufHomicideRate ? 'partial' : 'unavailable',
      notes: 'Proxy por UF. Fonte municipal plugavel recomendada: SENASP/IPEA.',
    }),
    buildMetric({
      key: 'traffic_mortality_uf_proxy',
      label: 'Mortalidade no transito (proxy UF)',
      category: 'saude',
      source: 'IBGE API (agregado 899/2151, proxy UF)',
      unit: 'obitos/100 mil',
      year: 2012,
      value: ufTrafficRate?.value ?? null,
      status: ufTrafficRate ? 'partial' : 'unavailable',
      notes: 'Proxy por UF.',
    }),
    buildMetric({
      key: 'crime_rate',
      label: 'Taxa de criminalidade municipal',
      category: 'seguranca',
      source: 'SINESP/SENASP (dados.gov.br / gov.br Conecta)',
      unit: 'ocorrencias/100 mil',
      year: null,
      value: null,
      status: 'unavailable',
      notes: 'Conector externo pendente.',
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
