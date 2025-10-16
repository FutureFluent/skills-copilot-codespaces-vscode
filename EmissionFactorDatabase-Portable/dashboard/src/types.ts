export type ConfidenceTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4';

export type EmissionFactorRecord = {
  id: string;
  naceCode: string;
  naceDescription: string;
  category: string;
  region: string;
  country: string;
  emissionFactor: number | null;
  currency: string;
  scope: string;
  tier: ConfidenceTier;
  year: number;
  supplierExample?: string;
  notes?: string;
};

export type DashboardFilters = {
  search: string;
  category: string;
  region: string;
  tier: string;
};
