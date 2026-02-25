import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { IndicatorPoint, TerritoryLevel } from '../lib/types';

type SidePanelProps = {
  selected: IndicatorPoint | null;
  indicatorLabel: string;
  indicatorSource: string;
  indicatorSourceUrl?: string;
  unit: string;
  levelLabel: string;
  points: IndicatorPoint[];
  mapStats: {
    min: number;
    max: number;
    average: number;
    count: number;
  } | null;
  indicatorSlug: string;
  level: TerritoryLevel;
  year: number;
  trendAvailable: boolean;
};

const formatValue = (value: number | null, unit: string): string => {
  if (value === null || Number.isNaN(value)) return 'N/D';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`.trim();
};

export const SidePanel = ({
  selected,
  indicatorLabel,
  indicatorSource,
  indicatorSourceUrl,
  unit,
  levelLabel,
  points,
  mapStats,
  indicatorSlug,
  level,
  year,
  trendAvailable,
}: SidePanelProps) => {
  const [previousValue, setPreviousValue] = useState<number | null>(null);

  useEffect(() => {
    if (!selected || !trendAvailable || year <= 1900) {
      setPreviousValue(null);
      return;
    }

    let alive = true;
    const previousYear = year - 1;

    const loadPrevious = async () => {
      try {
        const payload = await api.data({
          indicator: indicatorSlug,
          level,
          code: selected.code,
          year: previousYear,
          limit: 1,
        });

        if (!alive) return;
        const previous = payload.items.find((item) => item.code === selected.code) ?? payload.items[0] ?? null;
        setPreviousValue(previous?.value ?? null);
      } catch {
        if (!alive) return;
        setPreviousValue(null);
      }
    };

    loadPrevious();

    return () => {
      alive = false;
    };
  }, [selected, indicatorSlug, level, year, trendAvailable]);

  const rankingMap = useMemo(() => {
    return new Map(
      [...points]
        .sort((a, b) => b.value - a.value)
        .map((point, index) => [point.code, index + 1]),
    );
  }, [points]);

  const selectedRank = selected ? rankingMap.get(selected.code) ?? null : null;
  const average = mapStats?.average ?? null;
  const diffPercent =
    selected && average && average > 0
      ? ((selected.value - average) / average) * 100
      : null;
  const trendPercent =
    selected && previousValue && previousValue > 0
      ? ((selected.value - previousValue) / previousValue) * 100
      : null;

  return (
    <aside className="side-panel side-panel-metrics">
      <div className="panel-head">
        <h2>Painel</h2>
        <p className="panel-subtitle">Resumo rápido da área selecionada.</p>
      </div>

      <section className="panel-card panel-card-highlight">
        <p className="panel-label">Indicador do mapa</p>
        <p className="panel-main-text">{indicatorLabel}</p>
        <div className="panel-meta-grid">
          <div className="panel-meta-item">
            <p className="panel-label">Nível</p>
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
            <p className="panel-value">{formatValue(selected.value, unit)}</p>
            <div className="panel-insights">
              <p>
                <strong>Ranking:</strong>{' '}
                {selectedRank ? `${selectedRank} de ${points.length}` : 'N/D'}
              </p>
              <p>
                <strong>Comparativo médio:</strong>{' '}
                {diffPercent === null
                  ? 'N/D'
                  : `${diffPercent >= 0 ? '+' : ''}${diffPercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
              </p>
              <p>
                <strong>Situação:</strong>{' '}
                {diffPercent === null
                  ? 'Sem média para comparação.'
                  : diffPercent >= 0
                    ? 'Acima da média do recorte atual.'
                    : 'Abaixo da média do recorte atual.'}
              </p>
              <p>
                <strong>Tendência histórica:</strong>{' '}
                {!trendAvailable || year <= 1900
                  ? 'Não disponível para este indicador.'
                  : trendPercent === null
                    ? 'Sem base de ano anterior.'
                    : `${trendPercent >= 0 ? 'Alta' : 'Queda'} de ${Math.abs(trendPercent).toLocaleString('pt-BR', {
                        maximumFractionDigits: 1,
                      })}% vs ${year - 1}.`}
              </p>
            </div>
          </>
        ) : (
          <p className="panel-empty">Selecione uma área no mapa para ver o valor da métrica.</p>
        )}
      </section>
    </aside>
  );
};
