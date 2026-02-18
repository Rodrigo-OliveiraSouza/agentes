import type { IndicatorPoint } from '../lib/types';

type SidePanelProps = {
  selected: IndicatorPoint | null;
  indicatorLabel: string;
  indicatorSource: string;
  indicatorSourceUrl?: string;
  unit: string;
  levelLabel: string;
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
}: SidePanelProps) => {
  return (
    <aside className="side-panel side-panel-metrics">
      <div className="panel-head">
        <h2>Painel</h2>
        <p className="panel-subtitle">Resumo rapido da area selecionada.</p>
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
            <p className="panel-value">{formatValue(selected.value, unit)}</p>
          </>
        ) : (
          <p className="panel-empty">Selecione uma area no mapa para ver o valor da metrica.</p>
        )}
      </section>
    </aside>
  );
};
