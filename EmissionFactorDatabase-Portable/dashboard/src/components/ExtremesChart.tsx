import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { EmissionFactorRecord } from '../types';
import { ensureChartRegistration } from '../utils/chart';
import { formatEmissionValue } from '../utils/format';

ensureChartRegistration();

type ExtremesChartProps = {
  records: EmissionFactorRecord[];
};

const ExtremesChart = ({ records }: ExtremesChartProps) => {
  const { labels, chartData } = useMemo(() => {
    const validRecords = records.filter(
      (record) => record.emissionFactor !== null && !Number.isNaN(record.emissionFactor)
    );

    if (validRecords.length === 0) {
      return { labels: [] as string[], chartData: null };
    }

    const sorted = [...validRecords].sort(
      (a, b) => (b.emissionFactor ?? 0) - (a.emissionFactor ?? 0)
    );

    const maxItems = Math.min(5, sorted.length);
    const top = sorted.slice(0, maxItems);
    const bottom: EmissionFactorRecord[] = [];
    for (const record of [...sorted].reverse()) {
      if (bottom.length >= 5) break;
      const alreadyIncluded = top.some((item) => item.id === record.id);
      if (!alreadyIncluded) {
        bottom.push(record);
      }
    }

    const combined = [...top, ...bottom];
    const labels = combined.map((record, index) => {
      const baseLabel = `${record.country} – ${record.naceDescription}`;
      const truncated = baseLabel.length > 52 ? `${baseLabel.slice(0, 49).trimEnd()}…` : baseLabel;
      return index >= top.length ? `${truncated} (low)` : truncated;
    });

    const colours = combined.map((_, index) =>
      index < top.length ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)'
    );

    const data = combined.map((record) => record.emissionFactor ?? 0);

    return {
      labels,
      chartData: {
        labels,
        datasets: [
          {
            label: 'kg CO₂e per €',
            data,
            backgroundColor: colours,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      }
    };
  }, [records]);

  if (!chartData || labels.length === 0) {
    return (
      <article className="chart-card">
        <header className="chart-card__header">
          <h2 className="chart-card__title">Top & bottom emitters</h2>
          <p className="chart-card__meta">No comparable emission factors</p>
        </header>
        <div className="chart-card__empty">Apply different filters to view comparisons.</div>
      </article>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `kg CO₂e per €: ${formatEmissionValue(context.parsed.x)}`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: 'var(--color-text-muted)' },
        grid: { color: 'var(--color-border-soft)' }
      },
      y: {
        ticks: { color: 'var(--color-text-muted)', autoSkip: false },
        grid: { display: false }
      }
    }
  } as const;

  return (
    <article className="chart-card">
      <header className="chart-card__header">
        <h2 className="chart-card__title">Top & bottom emitters</h2>
        <p className="chart-card__meta">Highest and lowest intensities in scope</p>
      </header>
      <div className="chart-card__body">
        <Bar options={options} data={chartData} />
      </div>
    </article>
  );
};

export default ExtremesChart;
