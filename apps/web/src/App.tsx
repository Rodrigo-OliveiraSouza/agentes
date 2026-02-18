import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapCanvas } from './components/MapCanvas';
import { SidePanel } from './components/SidePanel';
import { PresentationSection } from './components/PresentationSection';
import { SiteFooter } from './components/SiteFooter';
import { api } from './lib/api';
import type {
  DataResponse,
  GeoJsonResponse,
  IndicatorDefinition,
  IndicatorPoint,
  Territory,
  TerritoryLevel,
  ViewMode,
} from './lib/types';
import { useFilterStore } from './store/useFilterStore';

const levelLabel: Record<TerritoryLevel, string> = {
  REGIAO: 'Regiao',
  UF: 'UF',
  MUNICIPIO: 'Municipio',
};

const modeOptions: ViewMode[] = ['choropleth', 'bubbles', 'heatmap', 'clusters'];

const indicatorLabelFrom = (slug: string, indicators: IndicatorDefinition[]): string => {
  return indicators.find((item) => item.slug === slug)?.label ?? slug;
};

const indicatorUnitFrom = (slug: string, indicators: IndicatorDefinition[]): string => {
  return indicators.find((item) => item.slug === slug)?.unit ?? '';
};

const indicatorSourceFrom = (slug: string, indicators: IndicatorDefinition[]): string => {
  const indicator = indicators.find((item) => item.slug === slug);
  return indicator?.sourceLabel ?? indicator?.source ?? 'Fonte nao informada';
};

const indicatorSourceUrlFrom = (slug: string, indicators: IndicatorDefinition[]): string | undefined => {
  return indicators.find((item) => item.slug === slug)?.sourceUrl;
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

const App = () => {
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

  const selectedIndicator = useMemo(
    () => indicators.find((item) => item.slug === indicator),
    [indicators, indicator],
  );

  const yearMin = selectedIndicator?.yearMin ?? 1900;
  const yearMax = selectedIndicator?.yearMax ?? 2100;
  const yearDefault = selectedIndicator?.defaultYear ?? yearMax;
  const yearLocked = yearMin === yearMax;

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
        setIndicators(indicatorItems);
        setRegions(regionItems);
        setAllUfs(ufItems);
        setUfs(ufItems);
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
        setMunicipalities(result);
      } catch (error) {
        if (!alive) return;
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar municipios.');
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
  }, [indicator, level, year, regionCode, ufCode, municipalityCode, selectedIndicator]);

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

  return (
    <div className="app-shell">
      <PresentationSection />

      <section id="mapa" className="map-shell">
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
            <label>Nivel</label>
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
              <option value="REGIAO">Regiao</option>
              <option value="UF">UF</option>
              <option value="MUNICIPIO">Municipio</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Regiao</label>
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
            <label>Municipio</label>
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
            <label>Visualizacao</label>
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
          <div className="loading-banner">Selecione uma UF para carregar municipios.</div>
        ) : null}

        <main className="content">
          <section className="map-area">
            <MapCanvas
              geojson={geojsonPayload?.geojson ?? null}
              points={sortedPoints}
              mode={viewMode}
              selectedCode={selectedCode}
              onSelect={handleMapSelect}
            />
          </section>

          <SidePanel
            selected={selectedPoint}
            indicatorLabel={indicatorLabelFrom(indicator, indicators)}
            indicatorSource={indicatorSourceFrom(indicator, indicators)}
            indicatorSourceUrl={indicatorSourceUrlFrom(indicator, indicators)}
            unit={indicatorUnitFrom(indicator, indicators)}
            levelLabel={levelLabel[level]}
            selectedCityCode={selectedCityCode}
          />
        </main>
      </section>

      <SiteFooter />
    </div>
  );
};

export default App;
