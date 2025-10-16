import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { EmissionFactorRecord } from '../types';
import { ensureChartRegistration } from '../utils/chart';
import { formatEmissionValue } from '../utils/format';

ensureChartRegistration();

type DistributionChartProps = {
  records: EmissionFactorRecord[];
};

const DistributionChart = ({ records }: DistributionChartProps) => {
  const { chartData, labels, totals } = useMemo(() => {
    const grouped = new Map<string, { sum: number; count: number }>();

    records.forEach((record) => {
      if (record.emissionFactor === null || Number.isNaN(record.emissionFactor)) {
        return;
      }
      const bucket = grouped.get(record.category) ?? { sum: 0, count: 0 };
      bucket.sum += record.emissionFactor;
      bucket.count += 1;
      grouped.set(record.category, bucket);
    });

    const entries = Array.from(grouped.entries())
      .map(([category, value]) => ({
        category,
        average: value.sum / value.count,
        count: value.count
      }))
      .sort((a, b) => b.average - a.average);

    const labels = entries.map((item) => item.category);
    const averages = entries.map((item) => Number(item.average.toFixed(3)));
    const totals = entries.reduce((acc, item) => acc + item.count, 0);

    return {
      labels,
      totals,
      chartData: {
        labels,
        datasets: [
          {
            label: 'Average kg CO₂e per €',
            data: averages,
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      }
    };
  }, [records]);

  if (labels.length === 0) {
    return (
      <article className="chart-card">
        <header className="chart-card__header">
          <h2 className="chart-card__title">Category distribution</h2>
          <p className="chart-card__meta">No emission factors in scope</p>
        </header>
        <div className="chart-card__empty">Adjust filters to populate the chart.</div>
      </article>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatEmissionValue(context.parsed.y ?? context.parsed)}`
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--color-text-muted)'
        },
        grid: {
          color: 'var(--color-border-soft)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: 'var(--color-text-muted)'
        },
        grid: {
          color: 'var(--color-border-soft)'
        }
      }
    }
  } as const;

  return (
    <article className="chart-card">
      <header className="chart-card__header">
        <h2 className="chart-card__title">Category distribution</h2>
        <p className="chart-card__meta">
          {labels.length} categories • {totals} records with emission factors
        </p>
      </header>
      <div className="chart-card__body">
        <Bar options={options} data={chartData} />
      </div>
    </article>
  );
};

export default DistributionChart;
