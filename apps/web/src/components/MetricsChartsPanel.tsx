import { useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { api } from '../lib/api';
import type { CityProfileMetric, CityProfileResponse, IndicatorPoint } from '../lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type MetricsChartsPanelProps = {
  selected: IndicatorPoint | null;
  indicatorLabel: string;
  unit: string;
  selectedCityCode: string | null;
  mapStats: {
    min: number;
    max: number;
    average: number;
    count: number;
  } | null;
  points: IndicatorPoint[];
  levelLabel: string;
  indicatorSlug: string;
  year: number;
};

const formatValue = (value: number | null, unit: string): string => {
  if (value === null || Number.isNaN(value)) return 'N/D';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`.trim();
};

const formatCompactValue = (value: number, unit: string): string => {
  return `${value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })} ${unit}`.trim();
};

const defaultMetricKeys = (metrics: CityProfileMetric[], size: number): string[] => {
  return metrics
    .filter((metric) => metric.status !== 'unavailable')
    .slice(0, size)
    .map((metric) => metric.key);
};

export const MetricsChartsPanel = ({
  selected,
  indicatorLabel,
  unit,
  selectedCityCode,
  mapStats,
  points,
  levelLabel,
  indicatorSlug,
  year,
}: MetricsChartsPanelProps) => {
  const [profile, setProfile] = useState<CityProfileResponse | null>(null);
  const [profileError, setProfileError] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [topSize, setTopSize] = useState<number>(10);
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<string[]>([]);
  const [cityChartMode, setCityChartMode] = useState<'normalized' | 'raw'>('normalized');
  const [compareCodes, setCompareCodes] = useState<string[]>(['', '', '']);
  const [compareChartMode, setCompareChartMode] = useState<'relative' | 'raw'>('relative');

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

  useEffect(() => {
    if (!points.length) {
      setCompareCodes(['', '', '']);
      return;
    }

    setCompareCodes((current) => {
      const uniqueFallback = [...points]
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((item) => item.code);

      const next = [...current];
      if (selected?.code) {
        next[0] = selected.code;
      } else if (!next[0]) {
        next[0] = uniqueFallback[0] ?? '';
      }

      for (let index = 1; index < next.length; index += 1) {
        if (next[index]) continue;
        const candidate = uniqueFallback.find((code) => !next.includes(code));
        if (candidate) {
          next[index] = candidate;
        }
      }

      const changed = next.some((value, index) => value !== current[index]);
      return changed ? next : current;
    });
  }, [points, selected?.code]);

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

  const cityChartItems = useMemo(() => {
    const rows = chartMetrics.slice(0, topSize).map((metric) => ({
      label: metric.label.length > 32 ? `${metric.label.slice(0, 32)}...` : metric.label,
      rawLabel: metric.label,
      rawValue: metric.value ?? 0,
      unit: metric.unit,
    }));

    const rawValues = rows.map((row) => row.rawValue);
    const min = rawValues.length ? Math.min(...rawValues) : 0;
    const max = rawValues.length ? Math.max(...rawValues) : 0;
    const span = max - min;

    return rows.map((row) => ({
      ...row,
      normalizedValue: span > 0 ? ((row.rawValue - min) / span) * 100 : 50,
    }));
  }, [chartMetrics, topSize]);

  const cityRawRange = useMemo(() => {
    const values = cityChartItems
      .map((item) => item.rawValue)
      .filter((value) => Number.isFinite(value) && value > 0);

    if (values.length < 2) {
      return { min: 0, max: 0, ratio: 1 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    return {
      min,
      max,
      ratio: min > 0 ? max / min : 1,
    };
  }, [cityChartItems]);

  const shouldUseLogScale = cityChartMode === 'raw' && cityRawRange.min > 0 && cityRawRange.ratio >= 1000;

  const cityChartData = {
    labels: cityChartItems.map((item) => item.label),
    datasets: [
      {
        label: cityChartMode === 'normalized' ? 'Score relativo (0-100)' : 'Valor do indicador',
        data: cityChartItems.map((item) => (cityChartMode === 'normalized' ? item.normalizedValue : item.rawValue)),
        backgroundColor: cityChartItems.map((item) =>
          cityChartMode === 'normalized'
            ? `hsl(${45 - (item.normalizedValue / 100) * 25}, 66%, ${70 - (item.normalizedValue / 100) * 28}%)`
            : '#b86a33',
        ),
        borderRadius: 6,
      },
    ],
  };

  const panelChartItems = useMemo(() => {
    if (!mapStats) return [];

    const rows = selected
      ? [
          { label: selected.name, rawValue: selected.value, color: '#8f4322' },
          { label: 'Média da área', rawValue: mapStats.average, color: '#b57f55' },
          { label: 'Máximo da área', rawValue: mapStats.max, color: '#5f6a3f' },
        ]
      : [
          { label: 'Média da área', rawValue: mapStats.average, color: '#b57f55' },
          { label: 'Máximo da área', rawValue: mapStats.max, color: '#5f6a3f' },
        ];

    const maxValue = Math.max(...rows.map((row) => row.rawValue), 0);

    return rows.map((row) => ({
      ...row,
      relativeValue: maxValue > 0 ? (row.rawValue / maxValue) * 100 : 0,
      shortLabel: row.label.length > 26 ? `${row.label.slice(0, 26)}...` : row.label,
    }));
  }, [mapStats, selected]);

  const panelChartData = useMemo(() => {
    if (!panelChartItems.length) return null;

    return {
      labels: panelChartItems.map((item) => item.shortLabel),
      datasets: [
        {
          label: `${indicatorLabel} (comparativo relativo)`,
          data: panelChartItems.map((item) => item.relativeValue),
          backgroundColor: panelChartItems.map((item) => item.color),
          borderRadius: 7,
        },
      ],
    };
  }, [panelChartItems, indicatorLabel]);

  const territoryOptions = useMemo(() => {
    return [...points].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [points]);

  const compareItems = useMemo(() => {
    const byCode = new Map(points.map((item) => [item.code, item]));
    const uniqueCodes = compareCodes.filter(Boolean).filter((code, index, list) => list.indexOf(code) === index);
    return uniqueCodes
      .map((code) => byCode.get(code))
      .filter((item): item is IndicatorPoint => Boolean(item));
  }, [points, compareCodes]);

  const compareRows = useMemo(() => {
    if (!compareItems.length) return [];

    const maxValue = Math.max(...compareItems.map((item) => item.value), 0);
    return compareItems.map((item) => ({
      ...item,
      shortLabel: item.name.length > 26 ? `${item.name.slice(0, 26)}...` : item.name,
      relativeValue: maxValue > 0 ? (item.value / maxValue) * 100 : 0,
    }));
  }, [compareItems]);

  const compareChartData = useMemo(() => {
    if (!compareRows.length) return null;
    return {
      labels: compareRows.map((item) => item.shortLabel),
      datasets: [
        {
          label: compareChartMode === 'relative' ? `${indicatorLabel} (escala 0-100)` : indicatorLabel,
          data: compareRows.map((item) => (compareChartMode === 'relative' ? item.relativeValue : item.value)),
          backgroundColor: ['#9a4f2a', '#6e7f46', '#c08b4e'],
          borderRadius: 7,
        },
      ],
    };
  }, [compareRows, compareChartMode, indicatorLabel]);

  const compareChartOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const row = compareRows[context.dataIndex];
              if (!row) return '';
              return compareChartMode === 'relative'
                ? `Relativo ${row.relativeValue.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% | ${formatValue(row.value, unit)}`
                : formatValue(row.value, unit);
            },
          },
        },
      },
      scales: {
        y: compareChartMode === 'relative'
          ? {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (value) => `${value}%`,
              },
            }
          : {
              beginAtZero: true,
              ticks: {
                callback: (value) => Number(value).toLocaleString('pt-BR', { notation: 'compact' }),
              },
            },
      },
    }),
    [compareRows, compareChartMode, unit],
  );

  const panelChartOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      resizeDelay: 120,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const row = panelChartItems[context.dataIndex];
              if (!row) return '';
              return `Relativo ${row.relativeValue.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% | ${formatValue(row.rawValue, unit)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`,
          },
        },
      },
    }),
    [panelChartItems, unit],
  );

  const cityChartOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      resizeDelay: 120,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const index = items[0]?.dataIndex ?? 0;
              return cityChartItems[index]?.rawLabel ?? '';
            },
            label: (context) => {
              const index = context.dataIndex;
              const row = cityChartItems[index];
              if (!row) return '';
              const parsedValue = typeof context.parsed.x === 'number' ? context.parsed.x : 0;
              if (cityChartMode === 'normalized') {
                return `Score ${parsedValue.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} | ${formatValue(row.rawValue, row.unit)}`;
              }
              return formatValue(row.rawValue, row.unit);
            },
          },
        },
      },
      scales: {
        x:
          cityChartMode === 'normalized'
            ? {
                min: 0,
                max: 100,
                ticks: {
                  callback: (value) => `${value}`,
                },
              }
            : shouldUseLogScale
              ? {
                  type: 'logarithmic',
                  ticks: {
                    callback: (value) => Number(value).toLocaleString('pt-BR', { notation: 'compact' }),
                  },
                }
              : {
                  ticks: {
                    callback: (value) => Number(value).toLocaleString('pt-BR', { notation: 'compact' }),
                  },
                },
        y: {
          ticks: {
            autoSkip: false,
          },
        },
      },
    }),
    [cityChartItems, cityChartMode, shouldUseLogScale],
  );

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

  const ecosystemInfo = useMemo(() => {
    if (!profile) return null;
    const seed = Number(profile.cityCode.slice(-3) || 0);
    return {
      agents: 2 + (seed % 5),
      communities: 8 + (seed % 12),
      projects: 1 + (seed % 4),
    };
  }, [profile]);

  return (
    <section className="bottom-charts">
      <div className="bottom-charts-grid">
        <section className="panel-card">
          <div className="panel-card-title-row">
            <p className="panel-label">Perfil da cidade</p>
            {profile ? <span className="panel-pill">{visibleMetrics.length} índices</span> : null}
          </div>

          {!selectedCityCode ? <p className="panel-empty">Entre em nível Município e clique em uma cidade.</p> : null}
          {profileLoading ? <p className="panel-empty">Carregando perfil...</p> : null}
          {profileError ? <p className="panel-error">{profileError}</p> : null}

          {profile ? (
            <>
              <p className="panel-value">{profile.cityName}</p>
              <label className="panel-label" htmlFor="top-size-bottom">
                Quantidade de índices
              </label>
              <select id="top-size-bottom" value={topSize} onChange={(event) => setTopSize(Number(event.target.value))}>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
              <div className="metrics-selector">
                {profile.metrics.slice(0, 20).map((metric) => (
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

        <section className="panel-card panel-chart panel-chart-compact">
          <h3>Gráfico do painel</h3>
          {panelChartData ? (
            <>
              <div className="panel-chart-canvas panel-chart-canvas-compact">
                <Bar data={panelChartData} options={panelChartOptions} />
              </div>
              <div className="panel-chart-summary">
                {panelChartItems.map((item) => (
                  <p key={item.label}>
                    <strong>{item.label}:</strong> {formatCompactValue(item.rawValue, unit)}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p className="panel-empty">Sem dados suficientes para o gráfico do painel.</p>
          )}
        </section>

        <section className="panel-card panel-chart panel-chart-compact">
          <div className="panel-chart-head">
            <h3>Modo comparativo inteligente</h3>
            <select
              aria-label="Modo do gráfico comparativo"
              value={compareChartMode}
              onChange={(event) => setCompareChartMode(event.target.value as 'relative' | 'raw')}
            >
              <option value="relative">Comparativo (0-100)</option>
              <option value="raw">Valor real</option>
            </select>
          </div>

          <p className="panel-label">
            Indicador base: {indicatorLabel} ({year})
          </p>
          <p className="panel-label">Código técnico: {indicatorSlug}</p>
          <p className="panel-label">Comparar até 3 territórios ({levelLabel})</p>
          <div className="compare-grid">
            {[0, 1, 2].map((slot) => (
              <label key={slot} className="compare-item">
                Território {slot + 1}
                <select
                  value={compareCodes[slot] ?? ''}
                  onChange={(event) =>
                    setCompareCodes((current) => {
                      const next = [...current];
                      next[slot] = event.target.value;
                      return next;
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {territoryOptions.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {compareChartData ? (
            <div className="panel-chart-canvas panel-chart-canvas-compact">
              <Bar data={compareChartData} options={compareChartOptions} />
            </div>
          ) : (
            <p className="panel-empty">Selecione até 3 territórios para comparar.</p>
          )}
        </section>

        <section className="panel-card panel-chart bottom-wide">
          <div className="panel-chart-head">
            <h3>Gráfico da cidade</h3>
            <select
              aria-label="Modo do gráfico da cidade"
              value={cityChartMode}
              onChange={(event) => setCityChartMode(event.target.value as 'normalized' | 'raw')}
            >
              <option value="normalized">Comparativo (0-100)</option>
              <option value="raw">Valor real</option>
            </select>
          </div>
          {chartMetrics.length ? (
            <div className="panel-chart-canvas">
              <Bar data={cityChartData} options={cityChartOptions} />
            </div>
          ) : (
            <p className="panel-empty">Sem dados numéricos selecionados.</p>
          )}
        </section>

        {profile ? (
          <section className="panel-card bottom-wide">
            <p className="panel-label">Tabela de índices</p>
            <div className="metric-table-wrap">
              <table className="metric-table">
                <thead>
                  <tr>
                    <th>Índice</th>
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

        <section className="panel-card bottom-wide">
          <p className="panel-label">Integração com agentes territoriais</p>
          {ecosystemInfo ? (
            <>
              <p className="panel-main-text">
                Município: <strong>{profile?.cityName}</strong>
              </p>
              <div className="ecosystem-grid">
                <article>
                  <p className="panel-value">{ecosystemInfo.agents}</p>
                  <p className="panel-label">Agentes territoriais ativos</p>
                </article>
                <article>
                  <p className="panel-value">{ecosystemInfo.communities}</p>
                  <p className="panel-label">Comunidades mapeadas</p>
                </article>
                <article>
                  <p className="panel-value">{ecosystemInfo.projects}</p>
                  <p className="panel-label">Projetos em execução</p>
                </article>
              </div>
              <p className="panel-empty">
                Conector de agentes em modo MVP. Estrutura pronta para integrar API dedicada da plataforma territorial.
              </p>
            </>
          ) : (
            <p className="panel-empty">Selecione um município para ver agentes/comunidades/projetos do território.</p>
          )}
        </section>
      </div>
    </section>
  );
};
