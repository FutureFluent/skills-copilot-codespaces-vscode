# Emission Factor Database – Portable data overview

This note captures the structure and contents of the `EmissionFactorDatabase-Portable` package that now lives under `data/raw/EmissionFactorDatabase-Portable/`. It focuses on the datasets, database schema, and data-quality considerations relevant to integrating the emission factor catalogue into dashboards or services.

## Package layout inside the repository

```
data/raw/EmissionFactorDatabase-Portable/
├── README.md                     # High-level product overview
├── INSTALLATION.md               # Import workflow
├── INTEGRATION_GUIDE.md          # Framework-specific examples
├── database/
│   └── schema.sql                # Canonical PostgreSQL schema
├── data/
│   ├── baseline/
│   │   └── nace_emission_factors_2022.csv
│   └── concordances/
│       └── NACE2_EXIOBASE20p_list.csv
├── docs/                         # Matching guide, quickstart, etc.
└── src/                          # Import pipeline & adapters
```

The `database/` and `src/` directories define how the CSV assets are ingested and expanded into ~44k product × country emission factors. Only the CSV files listed above provide raw numeric data inside the portable archive.

## CSV assets

### `data/baseline/nace_emission_factors_2022.csv`

* **Rows:** 44 (one per NACE Rev.2 division present in the baseline)
* **Source:** `EXIOBASE_3.9.6_IOT_2022` (AR6 GWP factors, Scope 3)
* **Purpose:** EU-level baseline factor used as the starting point for generating country-specific values in the import script.

| Column | Description | Notes |
| --- | --- | --- |
| `nace_code` | NACE Rev.2 code (e.g. `01.11`, `35.11`) | 4 entries carry "Unknown NACE description" labels (`05.20`, `08.92`, `10.41`, `10.61`). |
| `nace_description` | Text description of economic activity | Missing detail for the four codes above. |
| `emission_factor_kgco2e_per_eur` | Scope 3 intensity per euro of spend | Ranges from **0.0263** to **10.2560** kg CO2e/EUR. |
| `total_output_eur` | Economic output represented by the factor | Large float values taken from EXIOBASE IO tables. |
| `num_countries` | Count of countries contributing to the factor | Values span **16–49**; **22** rows use fewer than the full 49-country coverage. |
| `example_sectors` | Sample EXIOBASE product groupings | Helpful for UI tooltips. |
| `data_source` | Provenance string | Always `EXIOBASE_3.9.6_IOT_2022_pxp_AR6_GWP` in this file. |
| `year` | Source year | Presently `2022` for every row. |

Because the import script scales these baseline averages to individual countries, dashboards should treat them as EU-level anchors rather than the final country-specific emissions catalogue.

### `data/concordances/NACE2_EXIOBASE20p_list.csv`

* **Rows:** 905 mappings after the header (615 unique NACE codes).
* **Purpose:** Maps each NACE code to one or more EXIOBASE product codes used when expanding the baseline factors to detailed product-level rows.

| Column | Description | Notes |
| --- | --- | --- |
| `NACE2` | NACE Rev.2 code | Codes appear in dotted decimal form (e.g. `19.2`, `38.11`). |
| `EXIOBASE name` | EXIOBASE product label | Multiple entries per NACE where sectors split across EXIOBASE activities. |
| `EXIOBASE code` | EXIOBASE product identifier (e.g. `p40.11.e`) | Prefix indicates high-level sector (agriculture, electricity, etc.). |

Mapping density varies widely: high-variation sectors such as `19.2` (petroleum products) link to up to **21** EXIOBASE products, while some NACE codes map to a single product. Downstream logic must therefore expect one-to-many relationships when joining NACE transactions to EXIOBASE factors.

## Database schema provided in `database/schema.sql`

The schema targets PostgreSQL 12+ and creates five primary tables plus helper functions and triggers:

* **`emission_factors`** – Country- and product-specific factors (~44k rows expected post-import). Key fields include `nace_code`, `exiobase_product_code`, `country_code`, `emission_factor_kgco2e_per_eur`, optional `emission_factor_kgco2e_per_unit`, `scope`, and JSONB `metadata`. Unique index enforces one factor per NACE × product × country combination.
* **`nace_emission_factors`** – Aggregated fallback factors per NACE (Tier 4 in the matching hierarchy). Contains optional Scope 1/2/3 values, `exiobase_sectors` JSON, and confidence metadata.
* **`supplier_nace_mappings`** – Learns supplier → NACE relationships (`supplier_name_normalized`, `vat_number`, `confidence_score`, etc.) to drive Tier-1 matches.
* **`vat_cache`** – 24-hour cache of VAT lookups, storing `company_name`, `nace_code`, and validity flags.
* **`emission_category_mappings`** – Company-specific account code to emission factor links, enabling manual overrides or curated mappings.

Each table ships with indexes and triggers that auto-update `updated_at`. Helper functions such as `calculateCountrySpecificFactor` (in the import script) and `normalize_supplier_name` underpin the matching tiers documented in `docs/MATCHING_GUIDE.md`.

## Data scope and coverage

* **Provenance:** All factors are derived from **EXIOBASE 3.9.6 Input–Output Tables (2022 release)** with AR6 Global Warming Potential factors applied.
* **Emission scope:** Only **Scope 3 (supply chain)** intensities are provided in the portable package. The schema leaves space for Scope 1 and 2 should future data be available.
* **Geography:** Documentation claims **49 countries/regions**. The import script’s hard-coded `COUNTRY_MAPPINGS` includes standard ISO2 codes plus synthetic "Rest of World" aggregates (`WA`, `WM`, `WE`, `WF`, `WI`, `WW`), which are not ISO-standard and require custom handling in the dashboard.
* **Granularity:** The concordance and import pipeline expand a single NACE baseline to multiple EXIOBASE products and, subsequently, to country-specific factors. Expect significant variation within a NACE code depending on both product and geography (electricity factors range 0.012–0.950 kg CO2e/EUR across countries).

## Data-quality considerations for the dashboard

* **Baseline completeness:** The baseline CSV covers only **44 NACE codes**, far fewer than the 615 NACE codes referenced in the concordance file. Import scripts rely on heuristics to synthesize missing baselines; monitor for gaps or zeroed factors when new NACE codes appear.
* **Missing files vs documentation:** `README.md` references `data/concordances/country_mappings.json` and raw EXIOBASE text files (`EXIOBASE20r_CC41r.txt`, `MRSUT_2022/...`) that are **not included** in the portable archive. Any automation that assumes their presence will fail unless they are supplied separately.
* **Unknown NACE descriptions:** Four baseline rows carry the placeholder "Unknown NACE description" and therefore need manual labelling in any UI.
* **Country coverage variance:** `num_countries` shows that half of the baseline factors aggregate fewer than 49 countries (minimum observed: 16). Confidence scores in the import script downgrade these cases to "medium" or "low"; dashboards should surface this metadata or flag lower coverage.
* **Non-standard country codes:** Rest-of-world aggregates (`WA`, `WM`, etc.) and dual labels (e.g. "Great Britain and N.I." mapped to `GB`) require special-case display and may not match upstream ISO validation logic.
* **Heuristic adjustments:** The import pipeline (`src/import/import-full.ts`) scales EU averages with hard-coded multipliers for selected countries and sectors. These are assumptions rather than measured values; users should be warned that electricity and industrial factors baked in this way may differ from official EXIOBASE country data.
* **Wide factor range:** Emission intensities span more than **two orders of magnitude** (0.026–10.256 kg CO2e/EUR). Dashboards should apply log scales or outlier handling to keep charts legible.

Understanding these nuances will help the dashboard present emission factors responsibly and highlight areas where manual verification or future data imports are required.
