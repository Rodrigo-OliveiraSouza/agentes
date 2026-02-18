import { useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { api } from '../lib/api';
import type { CityProfileMetric, CityProfileResponse, IndicatorPoint } from '../lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type SidePanelProps = {
  selected: IndicatorPoint | null;
  indicatorLabel: string;
  indicatorSource: string;
  indicatorSourceUrl?: string;
  unit: string;
  levelLabel: string;
  selectedCityCode: string | null;
};

const formatValue = (value: number | null, unit: string): string => {
  if (value === null || Number.isNaN(value)) return 'N/D';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`.trim();
};

const defaultMetricKeys = (metrics: CityProfileMetric[], size: number): string[] => {
  return metrics
    .filter((metric) => metric.status !== 'unavailable')
    .slice(0, size)
    .map((metric) => metric.key);
};

export const SidePanel = ({
  selected,
  indicatorLabel,
  indicatorSource,
  indicatorSourceUrl,
  unit,
  levelLabel,
  selectedCityCode,
}: SidePanelProps) => {
  const [profile, setProfile] = useState<CityProfileResponse | null>(null);
  const [profileError, setProfileError] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [topSize, setTopSize] = useState<number>(10);
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedCityCode) {
      setProfile(null);
      setSelectedMetricKeys([]);
      setProfileError('');
      return;
    }

    let alive = true;
    setProfileLoading(true);
    setProfileError('');

    const loadProfile = async () => {
      try {
        const payload = await api.cityProfile(selectedCityCode);
        if (!alive) return;
        setProfile(payload);
        setSelectedMetricKeys(defaultMetricKeys(payload.metrics, topSize));
      } catch (error) {
        if (!alive) return;
        setProfileError(error instanceof Error ? error.message : 'Falha ao carregar perfil da cidade.');
        setProfile(null);
      } finally {
        if (alive) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      alive = false;
    };
  }, [selectedCityCode]);

  useEffect(() => {
    if (!profile) return;

    const available = profile.metrics
      .filter((metric) => metric.status !== 'unavailable')
      .map((metric) => metric.key);

    setSelectedMetricKeys((current) => {
      if (!current.length) {
        return available.slice(0, topSize);
      }

      const filtered = current.filter((item) => available.includes(item));
      if (!filtered.length) {
        return available.slice(0, topSize);
      }

      return filtered.slice(0, topSize);
    });
  }, [profile, topSize]);

  const visibleMetrics = useMemo(() => {
    if (!profile) return [];

    const selectedSet = new Set(selectedMetricKeys);
    return profile.metrics
      .filter((metric) => selectedSet.has(metric.key))
      .slice(0, topSize);
  }, [profile, selectedMetricKeys, topSize]);

  const chartMetrics = useMemo(() => {
    return visibleMetrics.filter((metric) => metric.value !== null);
  }, [visibleMetrics]);

  const chartData = {
    labels: chartMetrics.map((metric) => metric.label),
    datasets: [
      {
        label: 'Indices selecionados',
        data: chartMetrics.map((metric) => metric.value ?? 0),
        backgroundColor: '#1e90ff',
      },
    ],
  };

  const toggleMetric = (key: string) => {
    setSelectedMetricKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }

      if (current.length >= topSize) {
        return current;
      }

      return [...current, key];
    });
  };

  return (
    <aside className="side-panel">
      <div className="panel-head">
        <h2>Painel</h2>
        <p className="panel-subtitle">Leitura rapida do territorio selecionado.</p>
      </div>

      <section className="panel-card panel-card-highlight">
        <p className="panel-label">Indicador do mapa</p>
        <p className="panel-main-text">{indicatorLabel}</p>
        <div className="panel-meta-grid">
          <div className="panel-meta-item">
            <p className="panel-label">Nivel</p>
            <p className="panel-pill">{levelLabel}</p>
          </div>
          <div className="panel-meta-item">
            <p className="panel-label">Fonte</p>
            {indicatorSourceUrl ? (
              <a className="panel-link" href={indicatorSourceUrl} target="_blank" rel="noreferrer">
                {indicatorSource}
              </a>
            ) : (
              <p className="panel-main-text">{indicatorSource}</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel-card">
        <p className="panel-label">Selecionado no mapa</p>
        {selected ? (
          <>
            <p className="panel-selected-name">{selected.name}</p>
            <p className="panel-value">
              {selected.value.toLocaleString('pt-BR')} {unit}
            </p>
          </>
        ) : (
          <p className="panel-empty">Selecione uma area no mapa para ver o valor.</p>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-card-title-row">
          <p className="panel-label">Perfil da cidade</p>
          {profile ? <span className="panel-pill">{visibleMetrics.length} indices</span> : null}
        </div>

        {!selectedCityCode ? <p className="panel-empty">Entre em nivel Municipio e clique em uma cidade.</p> : null}
        {profileLoading ? <p className="panel-empty">Carregando perfil...</p> : null}
        {profileError ? <p className="panel-error">{profileError}</p> : null}

        {profile ? (
          <>
            <p className="panel-value">{profile.cityName}</p>
            <label className="panel-label" htmlFor="top-size">
              Quantidade de indices
            </label>
            <select id="top-size" value={topSize} onChange={(event) => setTopSize(Number(event.target.value))}>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
            <div className="metrics-selector">
              {profile.metrics.slice(0, 10).map((metric) => (
                <label key={metric.key} className="metric-item">
                  <input
                    type="checkbox"
                    checked={selectedMetricKeys.includes(metric.key)}
                    onChange={() => toggleMetric(metric.key)}
                  />
                  <span>{metric.label}</span>
                </label>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {profile ? (
        <section className="panel-card">
          <p className="panel-label">Tabela de indices</p>
          <div className="metric-table-wrap">
            <table className="metric-table">
              <thead>
                <tr>
                  <th>Indice</th>
                  <th>Valor</th>
                  <th>Fonte</th>
                  <th>Ano</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleMetrics.map((metric) => (
                  <tr key={metric.key}>
                    <td>{metric.label}</td>
                    <td>{formatValue(metric.value, metric.unit)}</td>
                    <td>{metric.source}</td>
                    <td>{metric.year ?? 'N/D'}</td>
                    <td>{metric.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="panel-card panel-chart">
        <h3>Grafico da cidade</h3>
        {chartMetrics.length ? (
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
            }}
          />
        ) : (
          <p className="panel-empty">Sem dados numericos selecionados.</p>
        )}
      </section>
    </aside>
  );
};
