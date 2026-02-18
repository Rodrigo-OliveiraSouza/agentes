import { useEffect, useMemo, useState } from 'react';
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
import { MapCanvas } from './components/MapCanvas';
import { SidePanel } from './components/SidePanel';

const levelLabel: Record<TerritoryLevel, string> = {
  REGIAO: 'Região',
  UF: 'UF',
  MUNICIPIO: 'Município',
};

const modeOptions: ViewMode[] = ['choropleth', 'bubbles', 'heatmap', 'clusters'];

const indicatorLabelFrom = (slug: string, indicators: IndicatorDefinition[]): string => {
  return indicators.find((item) => item.slug === slug)?.label ?? slug;
};

const indicatorUnitFrom = (slug: string, indicators: IndicatorDefinition[]): string => {
  return indicators.find((item) => item.slug === slug)?.unit ?? '';
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
  }, [indicator, level, year, regionCode, ufCode, municipalityCode]);

  const filteredPoints = useMemo(() => {
    if (!dataPayload) return [];

    let rows = filterByTerritorySelection(
      dataPayload.items,
      level,
      regionCode,
      ufCode,
      allUfs,
    );

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="filter-group">
          <label>Indicador</label>
          <select
            value={indicator}
            onChange={(event) => setFilter({ indicator: event.target.value, municipalityCode: '' })}
          >
            {indicators.map((item) => (
              <option key={item.slug} value={item.slug} disabled={!item.supported}>
                {item.label}{!item.supported ? ' (em breve)' : ''}
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
          <select
            value={ufCode}
            onChange={(event) => setFilter({ ufCode: event.target.value, municipalityCode: '' })}
          >
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
          <label>Ano (MVP)</label>
          <input
            type="number"
            min={2022}
            max={2022}
            value={year}
            disabled
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
            selectedCode={selectedCode}
            onSelect={(code) => setSelectedCode(code)}
          />
        </section>

        <SidePanel
          selected={selectedPoint}
          sortedPoints={sortedPoints}
          indicatorLabel={indicatorLabelFrom(indicator, indicators)}
          unit={indicatorUnitFrom(indicator, indicators)}
          levelLabel={levelLabel[level]}
        />
      </main>
    </div>
  );
};

export default App;

