import type { EmissionFactorRecord } from '../types';

export function formatEmissionValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  if (value >= 1) {
    return value.toFixed(2);
  }

  if (value >= 0.1) {
    return value.toFixed(3);
  }

  return value.toFixed(4);
}

export function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}

export function formatRecordLabel(record: EmissionFactorRecord | null): string {
  if (!record) {
    return 'No matching data';
  }

  const parts = [record.country, record.naceDescription];
  const filtered = parts.filter(Boolean);
  return filtered.join(' • ');
}
