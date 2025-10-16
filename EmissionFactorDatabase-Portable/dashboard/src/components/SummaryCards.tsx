import type { EmissionFactorRecord } from '../types';
import { formatEmissionValue, formatRecordLabel } from '../utils/format';

export type SummaryStats = {
  totalRecords: number;
  selectionModeLabel: string;
  uniqueCountries: number;
  averageEmission: number | null;
  medianEmission: number | null;
  averageDeltaPercent: number | null;
  highestRecord: EmissionFactorRecord | null;
  lowestRecord: EmissionFactorRecord | null;
};

function formatPercent(delta: number | null): string {
  if (delta === null || Number.isNaN(delta)) {
    return '—';
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

const SummaryCards = ({ stats }: { stats: SummaryStats }) => {
  return (
    <section className="summary-cards" aria-label="Summary statistics">
      <article className="summary-card">
        <h2 className="summary-card__title">Active records</h2>
        <p className="summary-card__value">{stats.totalRecords}</p>
        <p className="summary-card__meta">{stats.selectionModeLabel}</p>
        <p className="summary-card__meta">{stats.uniqueCountries} countries represented</p>
      </article>
      <article className="summary-card">
        <h2 className="summary-card__title">Average intensity</h2>
        <p className="summary-card__value">{formatEmissionValue(stats.averageEmission)}</p>
        <p className="summary-card__meta">
          Median: {formatEmissionValue(stats.medianEmission)} kg CO₂e/EUR
        </p>
        <p className="summary-card__delta">
          {stats.averageDeltaPercent === null
            ? 'Set filters to compare with global baseline'
            : `${formatPercent(stats.averageDeltaPercent)} vs portfolio average`}
        </p>
      </article>
      <article className="summary-card">
        <h2 className="summary-card__title">Highest emitter</h2>
        <p className="summary-card__value">
          {formatEmissionValue(stats.highestRecord?.emissionFactor)}
        </p>
        <p className="summary-card__meta">{formatRecordLabel(stats.highestRecord)}</p>
        <p className="summary-card__meta">
          Tier: {stats.highestRecord?.tier ?? 'Unknown'}
        </p>
      </article>
      <article className="summary-card">
        <h2 className="summary-card__title">Lowest emitter</h2>
        <p className="summary-card__value">
          {formatEmissionValue(stats.lowestRecord?.emissionFactor)}
        </p>
        <p className="summary-card__meta">{formatRecordLabel(stats.lowestRecord)}</p>
        <p className="summary-card__meta">
          Tier: {stats.lowestRecord?.tier ?? 'Unknown'}
        </p>
      </article>
    </section>
  );
};

export default SummaryCards;
