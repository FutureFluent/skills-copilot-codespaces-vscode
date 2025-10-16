import { useMemo, useState } from 'react';
import type { DashboardFilters, EmissionFactorRecord } from '../types';

const DEFAULT_FILTERS: DashboardFilters = {
  search: '',
  category: 'all',
  region: 'all',
  tier: 'all'
};

type UseDashboardStateResult = {
  filters: DashboardFilters;
  setFilter: (key: keyof DashboardFilters, value: string) => void;
  resetFilters: () => void;
  filteredRecords: EmissionFactorRecord[];
  activeRecords: EmissionFactorRecord[];
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  hasActiveSelection: boolean;
};

export function useDashboardState(
  records: EmissionFactorRecord[]
): UseDashboardStateResult {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const setFilter = (key: keyof DashboardFilters, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value
    }));
    setSelectedIds(new Set());
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedIds(new Set());
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.category !== 'all' && record.category !== filters.category) {
        return false;
      }

      if (filters.region !== 'all' && record.region !== filters.region) {
        return false;
      }

      if (filters.tier !== 'all' && record.tier !== filters.tier) {
        return false;
      }

      if (filters.search.trim()) {
        const needle = filters.search.trim().toLowerCase();
        const haystack = `${record.naceCode} ${record.naceDescription} ${record.country} ${record.category}`.toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }

      return true;
    });
  }, [filters, records]);

  const activeRecords = useMemo(() => {
    if (selectedIds.size === 0) {
      return filteredRecords;
    }

    return filteredRecords.filter((record) => selectedIds.has(record.id));
  }, [filteredRecords, selectedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  return {
    filters,
    setFilter,
    resetFilters,
    filteredRecords,
    activeRecords,
    selectedIds,
    toggleSelection,
    clearSelection,
    hasActiveSelection: selectedIds.size > 0
  };
}
