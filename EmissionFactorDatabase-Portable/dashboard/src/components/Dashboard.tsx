import { useMemo } from 'react';
import { emissionFactorRecords } from '../data/emissionFactors';
import { useDashboardState } from '../hooks/useDashboardState';
import type { EmissionFactorRecord } from '../types';
import DistributionChart from './DistributionChart';
import EmissionTable from './EmissionTable';
import ExtremesChart from './ExtremesChart';
import FilterPanel from './FilterPanel';
import SummaryCards, { type SummaryStats } from './SummaryCards';

const Dashboard = () => {
  const {
    filters,
    setFilter,
    resetFilters,
    filteredRecords,
    activeRecords,
    selectedIds,
    toggleSelection,
    clearSelection,
    hasActiveSelection
  } = useDashboardState(emissionFactorRecords);

  const categories = useMemo(
    () => Array.from(new Set(emissionFactorRecords.map((record) => record.category))).sort(),
    []
  );
  const regions = useMemo(
    () => Array.from(new Set(emissionFactorRecords.map((record) => record.region))).sort(),
    []
  );
  const tiers = useMemo(
    () => Array.from(new Set(emissionFactorRecords.map((record) => record.tier))).sort(),
    []
  );

  const globalAverage = useMemo(() => calculateAverage(emissionFactorRecords), []);

  const summaryStats = useMemo<SummaryStats>(() => {
    const average = calculateAverage(activeRecords);
    const median = calculateMedian(activeRecords);
    const highest = getExtreme(activeRecords, 'max');
    const lowest = getExtreme(activeRecords, 'min');
    const uniqueCountries = new Set(activeRecords.map((record) => record.country)).size;
    const delta =
      average !== null && globalAverage !== null && globalAverage > 0
        ? average / globalAverage - 1
        : null;

    const selectionModeLabel = hasActiveSelection
      ? `${activeRecords.length} selected of ${filteredRecords.length} filtered`
      : `${filteredRecords.length} records after filters`;

    return {
      totalRecords: activeRecords.length,
      selectionModeLabel,
      uniqueCountries,
      averageEmission: average,
      medianEmission: median,
      averageDeltaPercent: delta,
      highestRecord: highest,
      lowestRecord: lowest
    };
  }, [activeRecords, filteredRecords.length, globalAverage, hasActiveSelection]);

  return (
    <section className="dashboard" aria-label="Emission factor dashboard">
      <FilterPanel
        filters={filters}
        categories={categories}
        regions={regions}
        tiers={tiers}
        onFilterChange={setFilter}
        onReset={resetFilters}
      />
      <SummaryCards stats={summaryStats} />
      <div className="charts-grid">
        <DistributionChart records={activeRecords} />
        <ExtremesChart records={activeRecords} />
      </div>
      <EmissionTable
        records={filteredRecords}
        selectedIds={selectedIds}
        onSelect={toggleSelection}
        onClearSelection={clearSelection}
      />
    </section>
  );
};

function calculateAverage(records: EmissionFactorRecord[]): number | null {
  const values = records
    .map((record) => record.emissionFactor)
    .filter((value): value is number => value !== null && !Number.isNaN(value));

  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

function calculateMedian(records: EmissionFactorRecord[]): number | null {
  const values = records
    .map((record) => record.emissionFactor)
    .filter((value): value is number => value !== null && !Number.isNaN(value))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return null;
  }

  const midpoint = Math.floor(values.length / 2);
  if (values.length % 2 === 0) {
    return (values[midpoint - 1] + values[midpoint]) / 2;
  }

  return values[midpoint];
}

function getExtreme(
  records: EmissionFactorRecord[],
  mode: 'min' | 'max'
): EmissionFactorRecord | null {
  const values = records.filter(
    (record) => record.emissionFactor !== null && !Number.isNaN(record.emissionFactor)
  );

  if (values.length === 0) {
    return null;
  }

  return values.reduce((current, record) => {
    if (!current) return record;
    const shouldReplace =
      mode === 'max'
        ? (record.emissionFactor ?? 0) > (current.emissionFactor ?? 0)
        : (record.emissionFactor ?? Number.POSITIVE_INFINITY) <
          (current.emissionFactor ?? Number.POSITIVE_INFINITY);
    return shouldReplace ? record : current;
  }, values[0]);
}

export default Dashboard;
