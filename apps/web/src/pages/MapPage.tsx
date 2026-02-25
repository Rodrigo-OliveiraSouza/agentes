import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapCanvas } from '../components/MapCanvas';
import { SidePanel } from '../components/SidePanel';
import { MetricsChartsPanel } from '../components/MetricsChartsPanel';
import { SiteFooter } from '../components/SiteFooter';
import { api } from '../lib/api';
import type {
  DataResponse,
  GeoJsonResponse,
  IndicatorDefinition,
  IndicatorPoint,
  Territory,
  TerritoryLevel,
  ViewMode,
} from '../lib/types';
import { useFilterStore } from '../store/useFilterStore';

const levelLabel: Record<TerritoryLevel, string> = {
  REGIAO: 'Região',
  UF: 'UF',
  MUNICIPIO: 'Município',
};

type ThemeMode = 'institutional' | 'dark';
type LegendScaleMode = 'linear' | 'quartile' | 'percentile';

const legendScaleLabel: Record<LegendScaleMode, string> = {
  linear: 'Linear',
  quartile: 'Quartil',
  percentile: 'Percentil',
};

const modeOptions: ViewMode[] = ['choropleth', 'bubbles', 'heatmap', 'clusters'];
const territoryCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const sortTerritoriesByName = (items: Territory[]): Territory[] => {
  return [...items].sort((a, b) => territoryCollator.compare(a.name, b.name));
};

const indicatorLabelFrom = (slug: string, indicators: IndicatorDefinition[]): string => {
  return indicators.find((item) => item.slug === slug)?.label ?? slug;
};

const indicatorUnitFrom = (slug: string, indicators: IndicatorDefinition[]): string => {
  return indicators.find((item) => item.slug === slug)?.unit ?? '';
};

const indicatorSourceFrom = (slug: string, indicators: IndicatorDefinition[]): string => {
  const indicator = indicators.find((item) => item.slug === slug);
  return indicator?.sourceLabel ?? indicator?.source ?? 'Fonte não informada';
};

const indicatorSourceUrlFrom = (slug: string, indicators: IndicatorDefinition[]): string | undefined => {
  return indicators.find((item) => item.slug === slug)?.sourceUrl;
};

type SyntheticIndicatorKey = 'synthetic_vulnerability' | 'synthetic_equity' | 'synthetic_inclusion';

type SyntheticComponent = {
  slug: string;
  weight: number;
  direction: 'positive' | 'negative';
};

type SyntheticDefinition = {
  indicator: IndicatorDefinition;
  components: SyntheticComponent[];
};

const SYNTHETIC_INDICATORS: Record<SyntheticIndicatorKey, SyntheticDefinition> = {
  synthetic_vulnerability: {
    indicator: {
      slug: 'synthetic_vulnerability',
      label: 'Índice de Vulnerabilidade Territorial (sintético)',
      unit: 'score (0-100)',
      source: 'Composição ponderada de renda per capita, esgoto, alfabetização e extrema pobreza.',
      sourceLabel: 'Índice sintético (MVP)',
      sourceUrl: 'https://servicodados.ibge.gov.br/api/docs/',
      supported: true,
      yearMin: 2010,
      yearMax: 2024,
      defaultYear: 2022,
      notes: 'Quanto maior o score, maior vulnerabilidade territorial estimada.',
    },
    components: [
      { slug: 'income_per_capita', weight: 0.3, direction: 'negative' },
      { slug: 'sewer_network_coverage', weight: 0.25, direction: 'negative' },
      { slug: 'literacy_rate', weight: 0.2, direction: 'negative' },
      { slug: 'extreme_poverty_rate', weight: 0.25, direction: 'positive' },
    ],
  },
  synthetic_equity: {
    indicator: {
      slug: 'synthetic_equity',
      label: 'Índice de Equidade Racial (proxy sintético)',
      unit: 'score (0-100)',
      source: 'Composição ponderada de alfabetização, ensino superior, renda e acesso a saneamento.',
      sourceLabel: 'Índice sintético (MVP)',
      sourceUrl: 'https://servicodados.ibge.gov.br/api/docs/',
      supported: true,
      yearMin: 2010,
      yearMax: 2024,
      defaultYear: 2022,
      notes: 'Quanto maior o score, maior equidade territorial estimada.',
    },
    components: [
      { slug: 'literacy_rate', weight: 0.28, direction: 'positive' },
      { slug: 'higher_education_rate', weight: 0.27, direction: 'positive' },
      { slug: 'income_per_capita', weight: 0.25, direction: 'positive' },
      { slug: 'sewer_network_coverage', weight: 0.2, direction: 'positive' },
    ],
  },
  synthetic_inclusion: {
    indicator: {
      slug: 'synthetic_inclusion',
      label: 'Índice de Inclusão Social (sintético)',
      unit: 'score (0-100)',
      source: 'Composição ponderada de água, energia, internet e atenção primária.',
      sourceLabel: 'Índice sintético (MVP)',
      sourceUrl: 'https://servicodados.ibge.gov.br/api/docs/',
      supported: true,
      yearMin: 2010,
      yearMax: 2024,
      defaultYear: 2022,
      notes: 'Quanto maior o score, maior inclusão social territorial estimada.',
    },
    components: [
      { slug: 'water_network_coverage', weight: 0.28, direction: 'positive' },
      { slug: 'electricity_access_rate', weight: 0.22, direction: 'positive' },
      { slug: 'internet_access_rate', weight: 0.3, direction: 'positive' },
      { slug: 'primary_care_coverage', weight: 0.2, direction: 'positive' },
    ],
  },
};

const syntheticKeys = Object.keys(SYNTHETIC_INDICATORS) as SyntheticIndicatorKey[];

const isSyntheticIndicator = (slug: string): slug is SyntheticIndicatorKey => {
  return syntheticKeys.includes(slug as SyntheticIndicatorKey);
};

const withSyntheticIndicators = (base: IndicatorDefinition[]): IndicatorDefinition[] => {
  const existing = new Set(base.map((item) => item.slug));
  const syntheticItems = syntheticKeys
    .map((key) => SYNTHETIC_INDICATORS[key].indicator)
    .filter((item) => !existing.has(item.slug));
  return [...base, ...syntheticItems];
};

const clampYear = (value: number, min?: number, max?: number): number => {
  const minYear = min ?? value;
  const maxYear = max ?? value;
  if (value < minYear) return minYear;
  if (value > maxYear) return maxYear;
  return value;
};

const toSafeNumber = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
};

const buildRequestCode = (level: TerritoryLevel, ufCode: string, municipalityCode: string): string | undefined => {
  if (level === 'MUNICIPIO') {
    if (municipalityCode) {
      return municipalityCode;
    }

    if (ufCode) {
      return ufCode;
    }
  }

  return undefined;
};

const filterByTerritorySelection = (
  rows: IndicatorPoint[],
  level: TerritoryLevel,
  regionCode: string,
  ufCode: string,
  allUfs: Territory[],
): IndicatorPoint[] => {
  if (level === 'REGIAO') return rows;

  if (level === 'UF' && regionCode) {
    const allowedUfCodes = new Set(
      allUfs
        .filter((territory) => territory.level === 'UF' && territory.parentCode === regionCode)
        .map((territory) => territory.code),
    );

    return rows.filter((row) => allowedUfCodes.has(row.code));
  }

  if (level === 'MUNICIPIO' && ufCode) {
    return rows.filter((row) => row.code.startsWith(ufCode));
  }

  return rows;
};

const buildSyntheticData = async (
  slug: SyntheticIndicatorKey,
  level: TerritoryLevel,
  year: number,
  code: string | undefined,
  indicatorCatalog: IndicatorDefinition[],
): Promise<DataResponse> => {
  const config = SYNTHETIC_INDICATORS[slug];
  const requestedYear = year;

  const componentPayloads = await Promise.all(
    config.components.map(async (component) => {
      const definition = indicatorCatalog.find((item) => item.slug === component.slug);
      const componentYear = definition
        ? clampYear(requestedYear, definition.yearMin ?? definition.defaultYear, definition.yearMax ?? definition.defaultYear)
        : requestedYear;

      const payload = await api.data({
        indicator: component.slug,
        level,
        code,
        year: componentYear,
        limit: 20000,
      });

      const values = payload.items.map((item) => item.value).filter(Number.isFinite);
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const span = max - min;

      const normalizedMap = new Map(
        payload.items.map((item) => [
          item.code,
          span > 0 ? (item.value - min) / span : 0.5,
        ]),
      );

      return {
        component,
        normalizedMap,
        rawItems: payload.items,
      };
    }),
  );

  const namesByCode = new Map<string, { name: string; level: TerritoryLevel }>();
  const allCodes = new Set<string>();

  componentPayloads.forEach((item) => {
    item.rawItems.forEach((row) => {
      allCodes.add(row.code);
      if (!namesByCode.has(row.code)) {
        namesByCode.set(row.code, { name: row.name, level: row.level });
      }
    });
  });

  const points: IndicatorPoint[] = Array.from(allCodes).map((territoryCode) => {
    let weightedScore = 0;
    let weightSum = 0;

    componentPayloads.forEach((entry) => {
      const baseValue = entry.normalizedMap.get(territoryCode) ?? 0.5;
      const normalized = entry.component.direction === 'negative' ? 1 - baseValue : baseValue;
      weightedScore += normalized * entry.component.weight;
      weightSum += entry.component.weight;
    });

    const score = weightSum > 0 ? (weightedScore / weightSum) * 100 : 50;
    const nameInfo = namesByCode.get(territoryCode);

    return {
      code: territoryCode,
      name: nameInfo?.name ?? territoryCode,
      level: nameInfo?.level ?? level,
      year: requestedYear,
      value: toSafeNumber(score),
    };
  });

  const sorted = [...points].sort((a, b) => b.value - a.value);
  const values = sorted.map((item) => item.value);
  const total = values.reduce((sum, current) => sum + current, 0);

  return {
    indicator: slug,
    level,
    code: code ?? null,
    year: requestedYear,
    count: sorted.length,
    stats: {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
      average: values.length ? total / values.length : 0,
      total,
    },
    items: sorted,
  };
};

export const MapPage = () => {
  const {
    indicator,
    level,
    year,
    regionCode,
    ufCode,
    municipalityCode,
    search,
    viewMode,
    setFilter,
  } = useFilterStore();

  const mapShellRef = useRef<HTMLElement | null>(null);
  const [indicators, setIndicators] = useState<IndicatorDefinition[]>([]);
  const [regions, setRegions] = useState<Territory[]>([]);
  const [allUfs, setAllUfs] = useState<Territory[]>([]);
  const [ufs, setUfs] = useState<Territory[]>([]);
  const [municipalities, setMunicipalities] = useState<Territory[]>([]);
  const [geojsonPayload, setGeojsonPayload] = useState<GeoJsonResponse | null>(null);
  const [dataPayload, setDataPayload] = useState<DataResponse | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>('institutional');
  const [legendScaleMode, setLegendScaleMode] = useState<LegendScaleMode>('linear');
  const [shareNotice, setShareNotice] = useState<string>('');

  const selectedIndicator = useMemo(
    () => indicators.find((item) => item.slug === indicator),
    [indicators, indicator],
  );

  const yearMin = selectedIndicator?.yearMin ?? 1900;
  const yearMax = selectedIndicator?.yearMax ?? 2100;
  const yearDefault = selectedIndicator?.defaultYear ?? yearMax;
  const yearLocked = yearMin === yearMax;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-theme-mode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = new URLSearchParams(window.location.search);
    const partial: Partial<{
      indicator: string;
      level: TerritoryLevel;
      year: number;
      regionCode: string;
      ufCode: string;
      municipalityCode: string;
      search: string;
      viewMode: ViewMode;
    }> = {};

    const indicatorParam = query.get('indicator');
    if (indicatorParam) partial.indicator = indicatorParam;

    const levelParam = query.get('level');
    if (levelParam === 'REGIAO' || levelParam === 'UF' || levelParam === 'MUNICIPIO') {
      partial.level = levelParam;
    }

    const yearParam = query.get('year');
    if (yearParam && !Number.isNaN(Number(yearParam))) {
      partial.year = Number(yearParam);
    }

    partial.regionCode = query.get('region') ?? '';
    partial.ufCode = query.get('uf') ?? '';
    partial.municipalityCode = query.get('municipio') ?? '';
    partial.search = query.get('search') ?? '';

    const viewParam = query.get('view');
    if (viewParam === 'choropleth' || viewParam === 'bubbles' || viewParam === 'heatmap' || viewParam === 'clusters') {
      partial.viewMode = viewParam;
    }

    if (Object.keys(partial).length) {
      setFilter(partial);
    }

    const themeParam = query.get('theme');
    if (themeParam === 'dark' || themeParam === 'institutional') {
      setThemeMode(themeParam);
    }

    const legendParam = query.get('legend');
    if (legendParam === 'linear' || legendParam === 'quartile' || legendParam === 'percentile') {
      setLegendScaleMode(legendParam);
    }
  }, [setFilter]);

  useEffect(() => {
    let alive = true;

    const loadBootData = async () => {
      try {
        const [indicatorItems, regionItems, ufItems] = await Promise.all([
          api.indicators(),
          api.territories('REGIAO'),
          api.territories('UF'),
        ]);

        if (!alive) return;
        setIndicators(withSyntheticIndicators(indicatorItems));
        const sortedRegions = sortTerritoriesByName(regionItems);
        const sortedUfs = sortTerritoriesByName(ufItems);
        setRegions(sortedRegions);
        setAllUfs(sortedUfs);
        setUfs(sortedUfs);
      } catch (error) {
        if (!alive) return;
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar filtros iniciais.');
      }
    };

    loadBootData();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!indicators.length) return;

    const current = indicators.find((item) => item.slug === indicator);
    if (!current) {
      const fallback = indicators[0];
      if (!fallback) return;
      setFilter({
        indicator: fallback.slug,
        year: fallback.defaultYear ?? year,
      });
    }
  }, [indicators, indicator, setFilter, year]);

  useEffect(() => {
    if (!selectedIndicator) return;

    if (year < yearMin || year > yearMax) {
      setFilter({ year: yearDefault });
    }
  }, [selectedIndicator, year, yearMin, yearMax, yearDefault, setFilter]);

  useEffect(() => {
    if (!regionCode) {
      setUfs(allUfs);
      return;
    }

    setUfs(allUfs.filter((item) => item.parentCode === regionCode));
  }, [regionCode, allUfs]);

  useEffect(() => {
    if (!ufCode) {
      setMunicipalities([]);
      setFilter({ municipalityCode: '' });
      return;
    }

    let alive = true;

    const loadMunicipios = async () => {
      try {
        const result = await api.territories('MUNICIPIO', ufCode);
        if (!alive) return;
        setMunicipalities(sortTerritoriesByName(result));
      } catch (error) {
        if (!alive) return;
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar municípios.');
      }
    };

    loadMunicipios();

    return () => {
      alive = false;
    };
  }, [ufCode, setFilter]);

  useEffect(() => {
    setSelectedCode(null);

    if (level === 'MUNICIPIO' && !ufCode) {
      setGeojsonPayload(null);
      setDataPayload(null);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setErrorMessage('');

    const dataCode = buildRequestCode(level, ufCode, municipalityCode);
    const geojsonCode =
      level === 'UF'
        ? regionCode || undefined
        : level === 'MUNICIPIO'
          ? ufCode || undefined
          : undefined;

    if (selectedIndicator && isSyntheticIndicator(indicator)) {
      const loadSyntheticData = async () => {
        try {
          const [geojson, syntheticData] = await Promise.all([
            api.geojson({
              level,
              code: geojsonCode,
              simplified: true,
            }),
            buildSyntheticData(indicator, level, year, dataCode, indicators),
          ]);

          if (!alive) return;
          setGeojsonPayload(geojson);
          setDataPayload(syntheticData);
          setErrorMessage('');
        } catch (error) {
          if (!alive) return;
          setErrorMessage(error instanceof Error ? error.message : 'Falha ao montar índice sintético.');
        } finally {
          if (alive) {
            setLoading(false);
          }
        }
      };

      loadSyntheticData();
      return () => {
        alive = false;
      };
    }

    if (selectedIndicator && !selectedIndicator.supported) {
      const loadGeoOnly = async () => {
        try {
          const geojson = await api.geojson({
            level,
            code: geojsonCode,
            simplified: true,
          });

          if (!alive) return;
          setGeojsonPayload(geojson);
          setDataPayload(null);
          const sourceText = selectedIndicator.sourceLabel ?? selectedIndicator.source;
          setErrorMessage(`Indicador "${selectedIndicator.label}" em desenvolvimento. Fonte prevista: ${sourceText}.`);
        } catch (error) {
          if (!alive) return;
          setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar dados do mapa.');
        } finally {
          if (alive) {
            setLoading(false);
          }
        }
      };

      loadGeoOnly();
      return () => {
        alive = false;
      };
    }

    const loadMapData = async () => {
      try {
        const [geojson, data] = await Promise.all([
          api.geojson({
            level,
            code: geojsonCode,
            simplified: true,
          }),
          api.data({
            indicator,
            level,
            code: dataCode,
            year,
            limit: 6000,
          }),
        ]);

        if (!alive) return;
        setGeojsonPayload(geojson);
        setDataPayload(data);
      } catch (error) {
        if (!alive) return;
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar dados do mapa.');
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    loadMapData();

    return () => {
      alive = false;
    };
  }, [indicator, level, year, regionCode, ufCode, municipalityCode, selectedIndicator, indicators]);

  const filteredPoints = useMemo(() => {
    if (!dataPayload) return [];

    let rows = filterByTerritorySelection(dataPayload.items, level, regionCode, ufCode, allUfs);

    if (search.trim()) {
      const normalizedSearch = search.trim().toLowerCase();
      rows = rows.filter((row) => row.name.toLowerCase().includes(normalizedSearch));
    }

    return rows;
  }, [dataPayload, level, regionCode, ufCode, search, allUfs]);

  const sortedPoints = useMemo(() => {
    return [...filteredPoints].sort((a, b) => b.value - a.value);
  }, [filteredPoints]);

  const mapStats = useMemo(() => {
    if (!filteredPoints.length) return null;

    const values = filteredPoints.map((item) => item.value);
    const total = values.reduce((sum, value) => sum + value, 0);

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      average: total / values.length,
      count: values.length,
    };
  }, [filteredPoints]);

  const selectedPoint = useMemo(() => {
    if (!selectedCode) return null;
    return sortedPoints.find((point) => point.code === selectedCode) ?? null;
  }, [selectedCode, sortedPoints]);

  const selectedCityCode = useMemo(() => {
    if (level !== 'MUNICIPIO') return null;
    if (selectedCode && /^\d{7}$/.test(selectedCode)) return selectedCode;
    if (municipalityCode && /^\d{7}$/.test(municipalityCode)) return municipalityCode;
    return null;
  }, [level, selectedCode, municipalityCode]);

  const handleMapSelect = useCallback((code: string) => {
    setSelectedCode(code);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('indicator', indicator);
    params.set('level', level);
    params.set('year', String(year));
    if (regionCode) params.set('region', regionCode);
    if (ufCode) params.set('uf', ufCode);
    if (municipalityCode) params.set('municipio', municipalityCode);
    if (search) params.set('search', search);
    params.set('view', viewMode);
    params.set('theme', themeMode);
    params.set('legend', legendScaleMode);
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [indicator, level, year, regionCode, ufCode, municipalityCode, search, viewMode, themeMode, legendScaleMode]);

  const notifyShare = (message: string) => {
    setShareNotice(message);
    window.setTimeout(() => setShareNotice(''), 2400);
  };

  const handleShareFilters = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      notifyShare('Link copiado com filtros aplicados.');
    } catch {
      notifyShare('Não foi possível copiar. Copie a URL manualmente.');
    }
  };

  const handleExportCsv = () => {
    const header = ['ranking', 'código', 'território', 'indicador', 'ano', 'valor', 'nível'];
    const rows = sortedPoints.map((item, index) => [
      String(index + 1),
      item.code,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${indicatorLabelFrom(indicator, indicators).replace(/"/g, '""')}"`,
      String(item.year),
      item.value.toLocaleString('pt-BR', { maximumFractionDigits: 6 }).replace(/\./g, '').replace(',', '.'),
      item.level,
    ]);

    const csvContent = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `indicadores-${indicator}-${level}-${year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleExportGeoJson = () => {
    if (!geojsonPayload) {
      notifyShare('Não há malha carregada para exportar.');
      return;
    }

    const indicatorLabel = indicatorLabelFrom(indicator, indicators);
    const indicatorUnit = indicatorUnitFrom(indicator, indicators);
    const pointsByCode = new Map(sortedPoints.map((item) => [item.code, item]));

    const enriched = {
      ...geojsonPayload.geojson,
      features: geojsonPayload.geojson.features.map((feature) => {
        const code = String((feature.properties?.codarea as string | undefined) ?? '');
        const point = pointsByCode.get(code);
        return {
          ...feature,
          properties: {
            ...feature.properties,
            indicador: indicatorLabel,
            unidade: indicatorUnit,
            ano: year,
            valor: point?.value ?? null,
            nome: point?.name ?? feature.properties?.nome ?? code,
          },
        };
      }),
    };

    const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: 'application/geo+json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mapa-${indicator}-${level}-${year}.geojson`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportReport = () => {
    const now = new Date();
    const indicatorLabel = indicatorLabelFrom(indicator, indicators);
    const reportLines = [
      'RELATÓRIO TERRITORIAL - ESINAPIR',
      `Gerado em: ${now.toLocaleString('pt-BR')}`,
      '',
      `Indicador: ${indicatorLabel}`,
      `Nível: ${level}`,
      `Ano: ${year}`,
      `Total de registros: ${sortedPoints.length}`,
      '',
      'Resumo estatístico:',
      `- Mínimo: ${mapStats ? mapStats.min.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : 'N/D'}`,
      `- Média: ${mapStats ? mapStats.average.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : 'N/D'}`,
      `- Máximo: ${mapStats ? mapStats.max.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : 'N/D'}`,
      '',
      'Top 15 territórios:',
      ...sortedPoints.slice(0, 15).map((item, index) => {
        return `${index + 1}. ${item.name} (${item.code}) - ${item.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
      }),
      '',
      'Fonte principal: IBGE API',
      'Página completa: /mapas',
    ];

    const blob = new Blob([reportLines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `relatorio-${indicator}-${level}-${year}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleTheme = () => {
    setThemeMode((current) => (current === 'institutional' ? 'dark' : 'institutional'));
  };

  const togglePresentationMode = async () => {
    const root = mapShellRef.current;
    if (!root) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await root.requestFullscreen();
  };

  return (
    <div className="app-shell">
      <section id="mapa" className="map-shell" ref={mapShellRef}>
        <div className="map-page-nav">
          <a href="/">Esinapir - página de divulgação</a>
          <span>Painel técnico de mapas e indicadores</span>
        </div>
        <div className="map-shell-inner">
          <div className="map-governance">
            <div className="map-governance-inner">
              <p>gov.br | painel territorial de indicadores</p>
              <div className="map-governance-links">
                <a href="#governanca-acessibilidade">Acessibilidade</a>
                <a href="#governanca-politica-dados">Política de Dados</a>
                <a href="#governanca-lgpd">LGPD</a>
              </div>
            </div>
            <div className="map-actions-row">
              <button type="button" onClick={toggleTheme}>
                {themeMode === 'institutional' ? 'Tema escuro' : 'Tema claro institucional'}
              </button>
              <button type="button" onClick={handleShareFilters}>Compartilhar filtros</button>
              <button type="button" onClick={handleExportCsv}>Exportar CSV</button>
              <button type="button" onClick={handlePrintPdf}>Exportar PDF</button>
              <button type="button" onClick={handleExportGeoJson}>Baixar mapa (GeoJSON)</button>
              <button type="button" onClick={handleExportReport}>Baixar relatório</button>
              <button type="button" onClick={togglePresentationMode}>Modo apresentação</button>
              <label className="map-actions-select">
                Escala
                <select value={legendScaleMode} onChange={(event) => setLegendScaleMode(event.target.value as LegendScaleMode)}>
                  {Object.entries(legendScaleLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {shareNotice ? <p className="map-share-notice">{shareNotice}</p> : null}
          </div>

          <header className="map-header">
            <p className="map-header-kicker">Monitoramento de políticas públicas</p>
            <h2>Mapa e análise territorial</h2>
            <p>
              Consulte indicadores oficiais por município, compare territórios e acompanhe recortes de desigualdade
              com rastreabilidade de fonte.
            </p>
          </header>

          <header className="topbar">
          <div className="filter-group">
            <label>Indicador</label>
            <select
              value={indicator}
              onChange={(event) => {
                const nextSlug = event.target.value;
                const nextIndicator = indicators.find((item) => item.slug === nextSlug);
                setFilter({
                  indicator: nextSlug,
                  municipalityCode: '',
                  year: nextIndicator?.defaultYear ?? year,
                });
              }}
            >
              {indicators.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                  {item.sourceLabel ? ` - ${item.sourceLabel}` : ''}
                  {!item.supported ? ' (em breve)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Nível</label>
            <select
              value={level}
              onChange={(event) =>
                setFilter({
                  level: event.target.value as TerritoryLevel,
                  municipalityCode: '',
                  search: '',
                })
              }
            >
              <option value="REGIAO">Região</option>
              <option value="UF">UF</option>
              <option value="MUNICIPIO">Município</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Região</label>
            <select
              value={regionCode}
              onChange={(event) =>
                setFilter({
                  regionCode: event.target.value,
                  ufCode: '',
                  municipalityCode: '',
                })
              }
            >
              <option value="">Brasil</option>
              {regions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>UF</label>
            <select value={ufCode} onChange={(event) => setFilter({ ufCode: event.target.value, municipalityCode: '' })}>
              <option value="">Todas</option>
              {ufs.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.uf ? `${item.uf} - ${item.name}` : item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Município</label>
            <select
              value={municipalityCode}
              onChange={(event) => setFilter({ municipalityCode: event.target.value })}
              disabled={!ufCode}
            >
              <option value="">Todos</option>
              {municipalities.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group narrow">
            <label>Ano</label>
            <input
              type="number"
              min={yearMin}
              max={yearMax}
              value={year}
              disabled={yearLocked}
              onChange={(event) => setFilter({ year: Number(event.target.value) })}
            />
          </div>

          <div className="filter-group wide">
            <label>Busca</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setFilter({ search: event.target.value })}
              placeholder="Cidade/UF"
            />
          </div>

          <div className="filter-group">
            <label>Visualização</label>
            <select value={viewMode} onChange={(event) => setFilter({ viewMode: event.target.value as ViewMode })}>
              {modeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
          </header>

          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
          {loading ? <div className="loading-banner">Carregando dados...</div> : null}
          {level === 'MUNICIPIO' && !ufCode ? (
            <div className="loading-banner">Selecione uma UF para carregar municípios.</div>
          ) : null}

          <main className="content">
            <section className="map-area">
              <MapCanvas
                geojson={geojsonPayload?.geojson ?? null}
                points={sortedPoints}
                mode={viewMode}
                unit={indicatorUnitFrom(indicator, indicators)}
                selectedCode={selectedCode}
                onSelect={handleMapSelect}
                legendScaleMode={legendScaleMode}
                themeMode={themeMode}
              />
            </section>

            <SidePanel
              selected={selectedPoint}
              indicatorLabel={indicatorLabelFrom(indicator, indicators)}
              indicatorSource={indicatorSourceFrom(indicator, indicators)}
              indicatorSourceUrl={indicatorSourceUrlFrom(indicator, indicators)}
              unit={indicatorUnitFrom(indicator, indicators)}
              levelLabel={levelLabel[level]}
              points={sortedPoints}
              mapStats={mapStats}
              indicatorSlug={indicator}
              level={level}
              year={year}
              trendAvailable={!isSyntheticIndicator(indicator)}
            />
          </main>

          <MetricsChartsPanel
            selected={selectedPoint}
            indicatorLabel={indicatorLabelFrom(indicator, indicators)}
            unit={indicatorUnitFrom(indicator, indicators)}
            selectedCityCode={selectedCityCode}
            mapStats={mapStats}
            points={sortedPoints}
            levelLabel={levelLabel[level]}
            indicatorSlug={indicator}
            year={year}
          />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default MapPage;
