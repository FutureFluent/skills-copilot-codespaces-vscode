/**
 * Emission Factor Matcher - Framework Agnostic Core
 *
 * Pure functions for matching transactions to emission factors using 3-tier system.
 * Works with any PostgreSQL-compatible database through adapter pattern.
 *
 * @version 2.0
 * @license CC BY-SA 4.0
 */

import type {
  Transaction,
  EmissionFactor,
  MatchResult,
  DatabaseAdapter,
  MatcherConfig
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: MatcherConfig = {
  confidenceLevels: {
    tier1: 0.95,
    tier2: 0.85,
    tier3: 0.75,
    tier4: 0.65
  },
  methodConfidence: {
    vat_lookup: 0.95,
    account_mapping: 0.85,
    supplier_mapping: 0.75
  },
  tierAdjustments: {
    tier2: -0.10,
    tier3: -0.20,
    tier4: -0.30
  },
  enableLearning: true,
  cacheVAT: true,
  cacheTTL: 24 * 60 * 60 * 1000 // 24 hours
};

// VAT prefix to country mapping
const VAT_COUNTRY_MAP: Record<string, string> = {
  'SE': 'SE', 'NO': 'NO', 'DK': 'DK', 'FI': 'FI', 'IS': 'IS',
  'AT': 'AT', 'BE': 'BE', 'BG': 'BG', 'HR': 'HR', 'CY': 'CY',
  'CZ': 'CZ', 'DE': 'DE', 'EE': 'EE', 'GR': 'GR', 'ES': 'ES',
  'FR': 'FR', 'HU': 'HU', 'IE': 'IE', 'IT': 'IT', 'LV': 'LV',
  'LT': 'LT', 'LU': 'LU', 'MT': 'MT', 'NL': 'NL', 'PL': 'PL',
  'PT': 'PT', 'RO': 'RO', 'SK': 'SK', 'SI': 'SI', 'GB': 'GB',
  'CH': 'CH', 'US': 'US', 'CA': 'CA', 'AU': 'AU', 'JP': 'JP',
  'CN': 'CN', 'IN': 'IN', 'BR': 'BR', 'MX': 'MX', 'ZA': 'ZA',
  'KR': 'KR', 'TW': 'TW', 'ID': 'ID', 'TR': 'TR', 'RU': 'RU'
};

// EU member states for Tier 3 fallback
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract country code from VAT number
 */
export function getCountryFromVAT(vatNumber: string): string | null {
  if (!vatNumber || vatNumber.length < 2) return null;
  const prefix = vatNumber.substring(0, 2).toUpperCase();
  return VAT_COUNTRY_MAP[prefix] || null;
}

/**
 * Normalize supplier name (remove common company suffixes)
 */
export function normalizeSupplierName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*(ab|oy|as|gmbh|ltd|llc|inc|corp|sa|srl|bv|ag|nv|bhd|sdn|pte)\s*$/gi, '')
    .trim();
}

/**
 * Extract product hints from transaction description
 */
export function extractProductHints(description?: string): string[] {
  if (!description) return [];

  const hints: string[] = [];
  const text = description.toLowerCase();

  // Energy hints
  if (text.includes('wind')) hints.push('wind');
  if (text.includes('solar')) hints.push('solar');
  if (text.includes('hydro')) hints.push('hydro');
  if (text.includes('nuclear')) hints.push('nuclear');
  if (text.includes('coal')) hints.push('coal');
  if (text.includes('gas')) hints.push('gas');
  if (text.includes('electricity')) hints.push('electricity');

  // Transport hints
  if (text.includes('flight') || text.includes('airline')) hints.push('air transport');
  if (text.includes('train') || text.includes('railway')) hints.push('rail');
  if (text.includes('truck') || text.includes('freight')) hints.push('freight');

  // General hints
  if (text.includes('biofuel') || text.includes('renewable')) hints.push('renewable');
  if (text.includes('fossil')) hints.push('fossil');

  return hints;
}

// ============================================================================
// Tier Functions
// ============================================================================

/**
 * Tier 1: Exact Match (Country + NACE + Product)
 */
async function getEmissionFactorTier1(
  naceCode: string,
  countryCode: string,
  db: DatabaseAdapter,
  productHints?: string[]
): Promise<EmissionFactor | null> {
  // Try with product hints first
  if (productHints && productHints.length > 0) {
    for (const hint of productHints) {
      const factor = await db.findEmissionFactor({
        nace_code: naceCode,
        country_code: countryCode,
        product_hint: hint,
        scope: 'scope3',
        is_active: true
      });
      if (factor) return factor;
    }
  }

  // Try without product hint (any product for this NACE + country)
  return await db.findEmissionFactor({
    nace_code: naceCode,
    country_code: countryCode,
    scope: 'scope3',
    is_active: true
  });
}

/**
 * Tier 2: Country Average (Country + NACE, averaged across products)
 */
async function getEmissionFactorTier2(
  naceCode: string,
  countryCode: string,
  db: DatabaseAdapter
): Promise<EmissionFactor | null> {
  const factors = await db.findEmissionFactors({
    nace_code: naceCode,
    country_code: countryCode,
    scope: 'scope3',
    is_active: true
  });

  if (!factors || factors.length === 0) return null;

  // Calculate average
  const avgEmissionFactor = factors.reduce(
    (sum, f) => sum + f.emission_factor_kgco2e_per_eur,
    0
  ) / factors.length;

  // Return synthetic factor representing country average
  return {
    ...factors[0],
    emission_factor_kgco2e_per_eur: avgEmissionFactor,
    exiobase_product_code: null,
    exiobase_product_name: `Country Average (${factors.length} products)`,
    confidence_level: 'medium',
    metadata: {
      ...factors[0].metadata,
      tier: 2,
      num_products_averaged: factors.length,
      fallback_reason: 'No exact product match, using country average'
    }
  };
}

/**
 * Tier 3: EU Average (NACE only, averaged across EU countries)
 */
async function getEmissionFactorTier3(
  naceCode: string,
  db: DatabaseAdapter
): Promise<EmissionFactor | null> {
  const factors = await db.findEmissionFactors({
    nace_code: naceCode,
    country_codes: EU_COUNTRIES,
    scope: 'scope3',
    is_active: true
  });

  if (!factors || factors.length === 0) return null;

  // Calculate EU average
  const avgEmissionFactor = factors.reduce(
    (sum, f) => sum + f.emission_factor_kgco2e_per_eur,
    0
  ) / factors.length;

  // Return synthetic factor representing EU average
  return {
    ...factors[0],
    emission_factor_kgco2e_per_eur: avgEmissionFactor,
    country_code: 'EU',
    country_name: 'European Union (Average)',
    exiobase_product_code: null,
    exiobase_product_name: `EU Average (${factors.length} factors)`,
    confidence_level: 'medium',
    metadata: {
      ...factors[0].metadata,
      tier: 3,
      num_factors_averaged: factors.length,
      fallback_reason: 'No country-specific data, using EU average'
    }
  };
}

/**
 * Tier 4: Sector Average (Global fallback)
 */
async function getEmissionFactorTier4(
  naceCode: string,
  db: DatabaseAdapter
): Promise<EmissionFactor | null> {
  // Query nace_emission_factors table (aggregated global data)
  const naceFactors = await db.findNACEEmissionFactor(naceCode);
  if (!naceFactors) return null;

  return {
    id: naceFactors.id,
    nace_code: naceFactors.nace_code,
    category: naceFactors.nace_description || `NACE ${naceCode}`,
    subcategory: null,
    exiobase_product_code: null,
    exiobase_product_name: 'Sector Average',
    country_code: 'XX',
    country_name: 'Global Average',
    emission_factor_kgco2e_per_eur: naceFactors.scope_3_factor || 0,
    scope: 'scope3',
    confidence_level: 'low',
    data_source: naceFactors.source || 'EXIOBASE_AGGREGATED',
    metadata: {
      tier: 4,
      fallback_reason: 'No detailed data available, using global sector average'
    }
  };
}

/**
 * Get emission factor with intelligent tier fallback
 */
async function getEmissionFactorWithFallback(
  naceCode: string,
  db: DatabaseAdapter,
  config: MatcherConfig,
  countryCode?: string,
  productHints?: string[]
): Promise<{ factor: EmissionFactor | null; tier: 1 | 2 | 3 | 4 | null; reasoning: string }> {
  // Tier 1: Exact match
  if (countryCode) {
    const tier1 = await getEmissionFactorTier1(naceCode, countryCode, db, productHints);
    if (tier1) {
      const productInfo = productHints?.length ? ` + ${productHints[0]}` : '';
      return {
        factor: tier1,
        tier: 1,
        reasoning: `Exact match: ${countryCode} + NACE ${naceCode}${productInfo}`
      };
    }

    // Tier 2: Country average
    const tier2 = await getEmissionFactorTier2(naceCode, countryCode, db);
    if (tier2) {
      return {
        factor: tier2,
        tier: 2,
        reasoning: `Country average for ${countryCode} + NACE ${naceCode} (product-averaged)`
      };
    }
  }

  // Tier 3: EU average
  const tier3 = await getEmissionFactorTier3(naceCode, db);
  if (tier3) {
    return {
      factor: tier3,
      tier: 3,
      reasoning: `EU average for NACE ${naceCode} (country-averaged across EU)`
    };
  }

  // Tier 4: Sector average
  const tier4 = await getEmissionFactorTier4(naceCode, db);
  if (tier4) {
    return {
      factor: tier4,
      tier: 4,
      reasoning: `Global sector average for NACE ${naceCode}`
    };
  }

  return {
    factor: null,
    tier: null,
    reasoning: `No emission factor found for NACE ${naceCode}`
  };
}

// ============================================================================
// Matching Strategies
// ============================================================================

/**
 * Strategy 1: VAT-based matching
 */
async function matchByVAT(
  transaction: Transaction,
  db: DatabaseAdapter,
  config: MatcherConfig
): Promise<{ naceCode: string | null; countryCode: string | null }> {
  if (!transaction.vat_number) return { naceCode: null, countryCode: null };

  // Extract country from VAT
  const countryCode = getCountryFromVAT(transaction.vat_number);

  // Look up NACE from VAT cache
  if (config.cacheVAT) {
    const cached = await db.getVATCache(transaction.vat_number);
    if (cached && cached.is_valid) {
      return { naceCode: cached.nace_code, countryCode: countryCode || cached.country_code };
    }
  }

  // If not cached, would need external VAT lookup service
  // For now, return country only
  return { naceCode: null, countryCode };
}

/**
 * Strategy 2: Account code mapping
 */
async function matchByAccountCode(
  transaction: Transaction,
  companyId: string | undefined,
  db: DatabaseAdapter
): Promise<{ naceCode: string | null; emissionFactorId: string | null }> {
  if (!transaction.account_code || !companyId) {
    return { naceCode: null, emissionFactorId: null };
  }

  const mapping = await db.getAccountMapping(companyId, transaction.account_code);
  if (!mapping) return { naceCode: null, emissionFactorId: null };

  return {
    naceCode: mapping.nace_code,
    emissionFactorId: mapping.emission_factor_id
  };
}

/**
 * Strategy 3: Supplier name lookup
 */
async function matchBySupplierName(
  transaction: Transaction,
  db: DatabaseAdapter,
  config: MatcherConfig
): Promise<string | null> {
  if (!transaction.supplier_name) return null;

  const normalized = normalizeSupplierName(transaction.supplier_name);
  const mapping = await db.getSupplierMapping(normalized);

  if (!mapping) return null;

  // Increment usage counter (learning system)
  if (config.enableLearning && mapping.id) {
    await db.incrementSupplierUsage(mapping.id);
  }

  return mapping.nace_code;
}

// ============================================================================
// Main Matching Function
// ============================================================================

/**
 * Match transaction to emission factor using 3-tier system
 *
 * @param transaction - Transaction to match
 * @param db - Database adapter
 * @param companyId - Optional company ID for account mappings
 * @param config - Optional matcher configuration
 * @returns Match result with emission factor and metadata
 */
export async function matchTransaction(
  transaction: Transaction,
  db: DatabaseAdapter,
  companyId?: string,
  config: MatcherConfig = DEFAULT_CONFIG
): Promise<MatchResult> {
  const productHints = extractProductHints(transaction.description);
  let countryCode = transaction.supplier_country;

  // Strategy 1: VAT-based matching (highest confidence)
  if (transaction.vat_number) {
    const { naceCode, countryCode: vatCountry } = await matchByVAT(transaction, db, config);
    if (!countryCode && vatCountry) countryCode = vatCountry;

    if (naceCode) {
      const { factor, tier, reasoning } = await getEmissionFactorWithFallback(
        naceCode,
        db,
        config,
        countryCode,
        productHints
      );

      if (factor) {
        const baseConfidence = config.methodConfidence.vat_lookup;
        const tierAdjustment = tier === 1 ? 0 : config.tierAdjustments[`tier${tier}` as keyof typeof config.tierAdjustments] || 0;
        const confidence = Math.max(0, Math.min(1, baseConfidence + tierAdjustment));

        return {
          emissionFactor: factor,
          naceCode,
          countryCode: countryCode || null,
          productCode: factor.exiobase_product_code,
          confidence,
          tier,
          method: 'vat_lookup',
          reasoning: `VAT lookup → ${reasoning}`,
          fallbackApplied: tier !== 1
        };
      }
    }
  }

  // Strategy 2: Account code mapping
  if (transaction.account_code && companyId) {
    const { naceCode, emissionFactorId } = await matchByAccountCode(transaction, companyId, db);

    if (emissionFactorId) {
      const factor = await db.getEmissionFactorById(emissionFactorId);
      if (factor) {
        return {
          emissionFactor: factor,
          naceCode,
          countryCode: factor.country_code,
          productCode: factor.exiobase_product_code,
          confidence: config.methodConfidence.account_mapping,
          tier: 1,
          method: 'account_mapping',
          reasoning: `Account code ${transaction.account_code} → Pre-mapped emission factor`,
          fallbackApplied: false
        };
      }
    }

    if (naceCode) {
      const { factor, tier, reasoning } = await getEmissionFactorWithFallback(
        naceCode,
        db,
        config,
        countryCode,
        productHints
      );

      if (factor) {
        const baseConfidence = config.methodConfidence.account_mapping;
        const tierAdjustment = tier === 1 ? 0 : config.tierAdjustments[`tier${tier}` as keyof typeof config.tierAdjustments] || 0;
        const confidence = Math.max(0, Math.min(1, baseConfidence + tierAdjustment));

        return {
          emissionFactor: factor,
          naceCode,
          countryCode: countryCode || null,
          productCode: factor.exiobase_product_code,
          confidence,
          tier,
          method: 'account_mapping',
          reasoning: `Account code ${transaction.account_code} → ${reasoning}`,
          fallbackApplied: tier !== 1
        };
      }
    }
  }

  // Strategy 3: Supplier name lookup
  const naceCode = await matchBySupplierName(transaction, db, config);
  if (naceCode) {
    const { factor, tier, reasoning } = await getEmissionFactorWithFallback(
      naceCode,
      db,
      config,
      countryCode,
      productHints
    );

    if (factor) {
      const baseConfidence = config.methodConfidence.supplier_mapping;
      const tierAdjustment = tier === 1 ? 0 : config.tierAdjustments[`tier${tier}` as keyof typeof config.tierAdjustments] || 0;
      const confidence = Math.max(0, Math.min(1, baseConfidence + tierAdjustment));

      return {
        emissionFactor: factor,
        naceCode,
        countryCode: countryCode || null,
        productCode: factor.exiobase_product_code,
        confidence,
        tier,
        method: 'supplier_mapping',
        reasoning: `Supplier name → ${reasoning}`,
        fallbackApplied: tier !== 1
      };
    }
  }

  // No match found
  return {
    emissionFactor: null,
    naceCode: null,
    countryCode: null,
    productCode: null,
    confidence: 0,
    tier: null,
    method: 'none',
    reasoning: 'No automatic match found. Manual assignment required.',
    fallbackApplied: false
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate emissions from amount and emission factor
 */
export function calculateEmissions(
  amount: number,
  emissionFactorKgCO2ePerEur: number,
  currency: string = 'EUR',
  exchangeRate: number = 1.0
): number {
  const amountInEur = currency === 'EUR' ? amount : amount * exchangeRate;
  return amountInEur * emissionFactorKgCO2ePerEur;
}

/**
 * Batch match multiple transactions
 */
export async function batchMatchTransactions(
  transactions: Transaction[],
  db: DatabaseAdapter,
  companyId?: string,
  config: MatcherConfig = DEFAULT_CONFIG
): Promise<Map<string, MatchResult>> {
  const results = new Map<string, MatchResult>();

  for (const transaction of transactions) {
    const result = await matchTransaction(transaction, db, companyId, config);
    results.set(transaction.id, result);
  }

  return results;
}

/**
 * Get matching statistics from results
 */
export function getMatchingStatistics(results: Map<string, MatchResult>) {
  const total = results.size;
  let tier1 = 0, tier2 = 0, tier3 = 0, tier4 = 0, unmatched = 0;
  let totalConfidence = 0;

  results.forEach(result => {
    if (result.tier === 1) tier1++;
    else if (result.tier === 2) tier2++;
    else if (result.tier === 3) tier3++;
    else if (result.tier === 4) tier4++;
    else unmatched++;

    totalConfidence += result.confidence;
  });

  return {
    total,
    matched: total - unmatched,
    unmatched,
    tier1,
    tier2,
    tier3,
    tier4,
    matchRate: ((total - unmatched) / total * 100).toFixed(1) + '%',
    avgConfidence: (totalConfidence / total).toFixed(2),
    tier1Rate: (tier1 / total * 100).toFixed(1) + '%',
    tier2Rate: (tier2 / total * 100).toFixed(1) + '%',
    tier3Rate: (tier3 / total * 100).toFixed(1) + '%',
    tier4Rate: (tier4 / total * 100).toFixed(1) + '%'
  };
}

// ============================================================================
// Export
// ============================================================================

export {
  DEFAULT_CONFIG,
  VAT_COUNTRY_MAP,
  EU_COUNTRIES
};

export type {
  Transaction,
  EmissionFactor,
  MatchResult,
  DatabaseAdapter,
  MatcherConfig
} from './types';
