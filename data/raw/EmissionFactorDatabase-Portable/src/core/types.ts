/**
 * Type Definitions for Emission Factor Matching System
 *
 * @version 2.0
 * @license CC BY-SA 4.0
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Transaction to be matched to an emission factor
 */
export interface Transaction {
  /** Unique transaction identifier */
  id: string;

  /** Supplier/vendor name */
  supplier_name: string;

  /** Optional VAT number (enables country extraction and NACE lookup) */
  vat_number?: string;

  /** Optional account code for account-based mapping */
  account_code?: string;

  /** Transaction amount */
  amount: number;

  /** Transaction currency (default: EUR) */
  currency?: string;

  /** Optional transaction description (used for product hint extraction) */
  description?: string;

  /** Optional supplier country (ISO2 code, e.g., "SE") */
  supplier_country?: string;

  /** Optional transaction date */
  date?: Date | string;

  /** Optional category hint */
  category?: string;
}

/**
 * Emission Factor
 */
export interface EmissionFactor {
  /** Unique identifier */
  id: string;

  /** NACE Rev. 2 code (e.g., "35.11") */
  nace_code: string | null;

  /** High-level category */
  category: string;

  /** Subcategory (product name) */
  subcategory: string | null;

  /** Exiobase product code (e.g., "p40.11.e") */
  exiobase_product_code: string | null;

  /** Exiobase product name (e.g., "Electricity by wind") */
  exiobase_product_name: string | null;

  /** ISO2 country code (e.g., "SE") */
  country_code: string | null;

  /** Country name (e.g., "Sweden") */
  country_name: string | null;

  /** Emission factor in kg CO2e per EUR */
  emission_factor_kgco2e_per_eur: number;

  /** Optional: Emission factor per physical unit */
  emission_factor_kgco2e_per_unit?: number | null;

  /** Physical unit (e.g., "kWh", "kg") */
  physical_unit?: string | null;

  /** Emission scope */
  scope: 'scope1' | 'scope2' | 'scope3' | null;

  /** Region code */
  region?: string | null;

  /** Data source */
  data_source?: string | null;

  /** Source year */
  source_year?: number | null;

  /** Confidence level */
  confidence_level?: 'high' | 'medium' | 'low' | null;

  /** Total economic output (from Exiobase) */
  total_output_eur?: number | null;

  /** Number of countries in aggregation */
  num_countries?: number | null;

  /** Additional metadata (JSON) */
  metadata?: Record<string, any>;

  /** Active status */
  is_active?: boolean;

  /** Created timestamp */
  created_at?: Date | string;

  /** Updated timestamp */
  updated_at?: Date | string;
}

/**
 * Match Result
 */
export interface MatchResult {
  /** Matched emission factor (null if no match) */
  emissionFactor: EmissionFactor | null;

  /** NACE code used for matching */
  naceCode: string | null;

  /** Country code used for matching */
  countryCode: string | null;

  /** Exiobase product code matched */
  productCode: string | null;

  /** Confidence score (0-1) */
  confidence: number;

  /** Tier used (1=exact, 2=country avg, 3=EU avg, 4=sector avg) */
  tier: 1 | 2 | 3 | 4 | null;

  /** Matching method used */
  method: 'vat_lookup' | 'account_mapping' | 'supplier_mapping' | 'manual' | 'none';

  /** Human-readable reasoning */
  reasoning: string;

  /** Whether fallback was applied (tier > 1) */
  fallbackApplied: boolean;

  /** Optional: Calculated emissions (if amount provided) */
  emissions?: number;
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * NACE Emission Factor (aggregated, Tier 4 fallback)
 */
export interface NACEEmissionFactor {
  id: string;
  nace_code: string;
  nace_description: string | null;
  scope_1_factor: number | null;
  scope_2_factor: number | null;
  scope_3_factor: number | null;
  source: string | null;
  source_year: number | null;
  confidence_level: 'high' | 'medium' | 'low' | null;
  total_output_eur: number | null;
  num_countries: number | null;
  exiobase_sectors: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Supplier NACE Mapping (learning system)
 */
export interface SupplierNACEMapping {
  id: string;
  supplier_name_normalized: string;
  vat_number: string | null;
  country_code: string | null;
  nace_code: string;
  confidence_score: number;
  source: 'vat_lookup' | 'manual' | 'ai_suggested' | 'crowd_sourced' | 'user_verified' | null;
  times_used: number;
  verified_by: string | null;
  verified_at: Date | string | null;
  company_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * VAT Cache Entry
 */
export interface VATCache {
  id: string;
  vat_number: string;
  country_code: string | null;
  company_name: string | null;
  nace_code: string | null;
  is_valid: boolean;
  validation_date: Date | string | null;
  cached_at: Date | string;
  expires_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Emission Category Mapping (account code mapping)
 */
export interface EmissionCategoryMapping {
  id: string;
  company_id: string;
  account_code: string;
  account_name: string | null;
  nace_code: string | null;
  emission_factor_id: string | null;
  category: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// ============================================================================
// Database Adapter Interface
// ============================================================================

/**
 * Query filters for emission factors
 */
export interface EmissionFactorQuery {
  nace_code?: string;
  country_code?: string;
  country_codes?: string[];
  product_hint?: string;
  exiobase_product_code?: string;
  scope?: 'scope1' | 'scope2' | 'scope3';
  is_active?: boolean;
  confidence_level?: 'high' | 'medium' | 'low';
}

/**
 * Database Adapter Interface
 *
 * Implement this interface for your specific database/framework:
 * - PostgreSQL (pg, node-postgres)
 * - Supabase
 * - Prisma
 * - TypeORM
 * - Sequelize
 * - etc.
 */
export interface DatabaseAdapter {
  /**
   * Find a single emission factor matching criteria
   */
  findEmissionFactor(query: EmissionFactorQuery): Promise<EmissionFactor | null>;

  /**
   * Find multiple emission factors matching criteria
   */
  findEmissionFactors(query: EmissionFactorQuery): Promise<EmissionFactor[]>;

  /**
   * Get emission factor by ID
   */
  getEmissionFactorById(id: string): Promise<EmissionFactor | null>;

  /**
   * Find NACE emission factor (Tier 4 fallback)
   */
  findNACEEmissionFactor(naceCode: string): Promise<NACEEmissionFactor | null>;

  /**
   * Get VAT cache entry
   */
  getVATCache(vatNumber: string): Promise<VATCache | null>;

  /**
   * Get account code mapping
   */
  getAccountMapping(companyId: string, accountCode: string): Promise<EmissionCategoryMapping | null>;

  /**
   * Get supplier NACE mapping
   */
  getSupplierMapping(supplierNameNormalized: string): Promise<SupplierNACEMapping | null>;

  /**
   * Increment supplier usage counter (learning system)
   */
  incrementSupplierUsage(supplierId: string): Promise<void>;

  /**
   * Optional: Insert VAT cache entry
   */
  setVATCache?(entry: Omit<VATCache, 'id' | 'created_at' | 'updated_at'>): Promise<void>;

  /**
   * Optional: Insert supplier mapping
   */
  setSupplierMapping?(mapping: Omit<SupplierNACEMapping, 'id' | 'created_at' | 'updated_at' | 'times_used'>): Promise<void>;

  /**
   * Optional: Insert account mapping
   */
  setAccountMapping?(mapping: Omit<EmissionCategoryMapping, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Matcher Configuration
 */
export interface MatcherConfig {
  /** Confidence levels by tier */
  confidenceLevels: {
    tier1: number;  // Default: 0.95
    tier2: number;  // Default: 0.85
    tier3: number;  // Default: 0.75
    tier4: number;  // Default: 0.65
  };

  /** Base confidence by matching method */
  methodConfidence: {
    vat_lookup: number;        // Default: 0.95
    account_mapping: number;   // Default: 0.85
    supplier_mapping: number;  // Default: 0.75
  };

  /** Confidence adjustments when fallback tiers are used */
  tierAdjustments: {
    tier2: number;  // Default: -0.10
    tier3: number;  // Default: -0.20
    tier4: number;  // Default: -0.30
  };

  /** Enable learning system (increment supplier usage) */
  enableLearning: boolean;  // Default: true

  /** Enable VAT caching */
  cacheVAT: boolean;  // Default: true

  /** VAT cache TTL in milliseconds */
  cacheTTL: number;  // Default: 86400000 (24 hours)
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Matching Statistics
 */
export interface MatchingStatistics {
  /** Total transactions processed */
  total: number;

  /** Number of successful matches */
  matched: number;

  /** Number of unmatched transactions */
  unmatched: number;

  /** Number of Tier 1 matches (exact) */
  tier1: number;

  /** Number of Tier 2 matches (country avg) */
  tier2: number;

  /** Number of Tier 3 matches (EU avg) */
  tier3: number;

  /** Number of Tier 4 matches (sector avg) */
  tier4: number;

  /** Match rate percentage */
  matchRate: string;

  /** Average confidence score */
  avgConfidence: string;

  /** Tier 1 percentage */
  tier1Rate: string;

  /** Tier 2 percentage */
  tier2Rate: string;

  /** Tier 3 percentage */
  tier3Rate: string;

  /** Tier 4 percentage */
  tier4Rate: string;
}

// ============================================================================
// Import/Export Types
// ============================================================================

/**
 * NACE Concordance (from CSV)
 */
export interface NACEConcordance {
  nace_code: string;
  exiobase_name: string;
  exiobase_code: string;
}

/**
 * Country Mapping (from JSON)
 */
export interface CountryMapping {
  exiobase_name: string;
  iso2_code: string;
  name: string;
  region: string;
  energy_mix_multiplier?: number;
}

/**
 * Emission Factor Import Record
 */
export interface EmissionFactorImport {
  nace_code: string;
  category: string;
  subcategory: string | null;
  exiobase_product_code: string;
  exiobase_product_name: string;
  country_code: string;
  country_name: string;
  emission_factor_kgco2e_per_eur: number;
  scope: 'scope1' | 'scope2' | 'scope3';
  region: string;
  data_source: string;
  source_year: number;
  confidence_level: 'high' | 'medium' | 'low';
  total_output_eur: number | null;
  num_countries: number | null;
  metadata: Record<string, any>;
  is_active: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for async operations
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
