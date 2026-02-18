import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { IndicatorPoint } from '../lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type SidePanelProps = {
  selected: IndicatorPoint | null;
  sortedPoints: IndicatorPoint[];
  indicatorLabel: string;
  unit: string;
  levelLabel: string;
};

export const SidePanel = ({ selected, sortedPoints, indicatorLabel, unit, levelLabel }: SidePanelProps) => {
  const top10 = sortedPoints.slice(0, 10);

  const chartData = {
    labels: top10.map((point) => point.name.replace(/ - [A-Z]{2}$/, '')),
    datasets: [
      {
        label: `${indicatorLabel} (${unit})`,
        data: top10.map((point) => point.value),
        backgroundColor: '#1e90ff',
      },
    ],
  };

  return (
    <aside className="side-panel">
      <h2>Painel</h2>
      <div className="panel-block">
        <p className="panel-label">Indicador</p>
        <p>{indicatorLabel}</p>
      </div>
      <div className="panel-block">
        <p className="panel-label">Nível</p>
        <p>{levelLabel}</p>
      </div>
      <div className="panel-block">
        <p className="panel-label">Selecionado</p>
        {selected ? (
          <>
            <p>{selected.name}</p>
            <p className="panel-value">{selected.value.toLocaleString('pt-BR')} {unit}</p>
          </>
        ) : (
          <p>Selecione uma área no mapa.</p>
        )}
      </div>
      <div className="panel-chart">
        <h3>Top 10</h3>
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
      </div>
    </aside>
  );
};

