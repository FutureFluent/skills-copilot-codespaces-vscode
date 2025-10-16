# Installation Instructions

Quick start guide to get the Emission Factor Database running in your project.

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **PostgreSQL 12+** installed (or cloud provider: Supabase, Neon, AWS RDS, etc.)
- ✅ **Node.js 18+** installed
- ✅ **~500MB disk space** for emission factors table
- ✅ **Database connection string** ready

## 🚀 Installation Steps

### Step 1: Extract Package

```bash
# Extract the portable package to your desired location
cd /path/to/your/project
unzip EmissionFactorDatabase-Portable.zip
cd EmissionFactorDatabase-Portable
```

### Step 2: Install Dependencies

```bash
npm install
```

**Dependencies installed:**
- `csv-parse` - For reading concordance files
- `pg` (peer dependency) - PostgreSQL client

### Step 3: Set Up Database

#### Option A: All-in-One Schema (Recommended)

```bash
# Single command to create all tables
psql $DATABASE_URL -f database/schema.sql
```

#### Option B: Step-by-Step Migrations

```bash
# Create individual migrations if you prefer granular control
psql $DATABASE_URL -f database/migrations/001_create_tables.sql
psql $DATABASE_URL -f database/migrations/002_add_country_fields.sql
psql $DATABASE_URL -f database/migrations/003_create_indexes.sql
```

### Step 4: Configure Database Connection

```bash
# Set environment variable
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Or create .env file
echo "DATABASE_URL=postgresql://user:password@host:5432/database" > .env
```

### Step 5: Import Emission Factors

```bash
# Run import script (~3 minutes)
npm run import
```

**Expected output:**
```
═══════════════════════════════════════════════════════════
  Enhanced Exiobase Import - Full Country-Specific Data
═══════════════════════════════════════════════════════════

🚀 Generating detailed country-specific emission factors...

📊 Generating factors for:
   - 906 NACE → Product mappings
   - 49 countries/regions
   - Expected output: ~44,394 emission factors

   ⏳ Generated 10,000 emission factors...
   ⏳ Generated 20,000 emission factors...
   ⏳ Generated 30,000 emission factors...
   ⏳ Generated 40,000 emission factors...

✅ Generated 44,394 detailed emission factors

💾 Inserting emission factors into database...
   ✅ Inserted batch 1/45 (1,000 total)
   ✅ Inserted batch 2/45 (2,000 total)
   ...
   ✅ Inserted batch 45/45 (44,394 total)

✅ Import completed successfully!
```

### Step 6: Verify Installation

```bash
# Check total count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM emission_factors;"
# Expected: 44394

# Check country coverage
psql $DATABASE_URL -c "SELECT COUNT(DISTINCT country_code) FROM emission_factors;"
# Expected: 49

# Check NACE coverage
psql $DATABASE_URL -c "SELECT COUNT(DISTINCT nace_code) FROM emission_factors;"
# Expected: 44-906

# Sample data check
psql $DATABASE_URL -c "SELECT nace_code, country_code, exiobase_product_name, emission_factor_kgco2e_per_eur FROM emission_factors WHERE nace_code = '35.11' ORDER BY emission_factor_kgco2e_per_eur LIMIT 5;"
```

**Expected output:**
```
 nace_code | country_code |  exiobase_product_name   | emission_factor_kgco2e_per_eur
-----------+--------------+--------------------------+--------------------------------
 35.11     | SE           | Electricity by wind      | 0.0120
 35.11     | NO           | Electricity by hydro     | 0.0150
 35.11     | FR           | Electricity by nuclear   | 0.0200
 35.11     | CH           | Electricity by hydro     | 0.0300
 35.11     | AT           | Electricity by hydro     | 0.1000
```

## 🔧 Integration into Your Project

### TypeScript/Node.js Projects

#### Copy Core Files

```bash
# Copy to your project
cp -r src/core /path/to/your/project/src/lib/emission-matcher/
cp -r src/database /path/to/your/project/src/lib/emission-matcher/
```

#### Import and Use

```typescript
// your-file.ts
import { matchTransaction } from './lib/emission-matcher/core/matcher';
import { createPostgresAdapter } from './lib/emission-matcher/database/postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = createPostgresAdapter(pool);

const result = await matchTransaction({
  id: 'tx_001',
  supplier_name: 'Vattenfall AB',
  vat_number: 'SE556036-2138',
  amount: 10000,
  currency: 'EUR'
}, db);

console.log(`Emissions: ${result.emissions} kg CO2e`);
console.log(`Confidence: ${result.confidence}%`);
console.log(`Tier: ${result.tier}`);
```

### Python Projects

See `examples/python/` for a Python adapter example.

```bash
cp examples/python/emission_matcher.py /path/to/your/project/
```

### Ruby Projects

See `examples/ruby/` for a Ruby adapter example.

```bash
cp examples/ruby/emission_matcher.rb /path/to/your/project/lib/
```

### Other Languages

The core logic is in the database. Any language with PostgreSQL support can:

1. Query `emission_factors` table with NACE code + country code
2. Implement tier fallback logic in SQL or application code
3. Use the same 3-tier matching algorithm

## 📦 What's Included

```
EmissionFactorDatabase-Portable/
├── README.md                          # Main documentation
├── INSTALLATION.md                    # This file
├── INTEGRATION_GUIDE.md               # Detailed integration guide
├── LICENSE.md                         # CC BY-SA 4.0 license
│
├── database/
│   ├── schema.sql                     # Complete database schema (all-in-one)
│   └── migrations/                    # Individual migration files
│       ├── 001_create_tables.sql
│       ├── 002_add_country_fields.sql
│       └── 003_create_indexes.sql
│
├── data/
│   ├── concordances/                  # NACE → Exiobase mappings
│   │   └── NACE2_EXIOBASE20p_list.csv (906 mappings)
│   └── baseline/
│       └── nace_emission_factors_2022.csv (44 NACE codes)
│
├── src/
│   ├── core/                          # Framework-agnostic core
│   │   ├── matcher.ts                 # 3-tier matching logic
│   │   ├── types.ts                   # TypeScript types
│   │   └── utils.ts                   # Helper functions
│   │
│   ├── database/                      # Database adapters
│   │   ├── postgres.ts                # PostgreSQL adapter
│   │   ├── supabase.ts                # Supabase adapter
│   │   └── prisma.ts                  # Prisma adapter
│   │
│   └── import/                        # Import scripts
│       └── import-full.ts             # Full import script
│
├── docs/                              # Documentation
│   ├── MATCHING_GUIDE.md              # How matching works
│   ├── QUICKSTART.md                  # 5-minute quick start
│   └── API_REFERENCE.md               # API documentation
│
├── examples/                          # Integration examples
│   ├── nextjs/                        # Next.js example
│   ├── nodejs/                        # Node.js/Express example
│   ├── python/                        # Python adapter
│   └── ruby/                          # Ruby adapter
│
└── package.json                       # Node.js dependencies
```

## 🎯 Next Steps

1. **Read the guides:**
   - `README.md` - Overview and quick start
   - `INTEGRATION_GUIDE.md` - Framework-specific integrations
   - `docs/MATCHING_GUIDE.md` - How the 3-tier system works

2. **Test the system:**
   ```bash
   # Create test file
   touch test-matching.ts

   # Add test code (see examples/)

   # Run test
   npx tsx test-matching.ts
   ```

3. **Integrate into your app:**
   - Copy core files to your project
   - Create database adapter for your framework
   - Implement emission calculation endpoints

4. **Customize:**
   - Adjust confidence thresholds in `matcher.ts`
   - Add custom country mappings
   - Configure caching strategy

## 🔒 Database Credentials

### Local PostgreSQL

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb
```

### Supabase

```bash
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### AWS RDS

```bash
DATABASE_URL=postgresql://username:password@mydb.abc123.us-east-1.rds.amazonaws.com:5432/postgres
```

### Google Cloud SQL

```bash
DATABASE_URL=postgresql://username:password@/database?host=/cloudsql/[PROJECT]:us-central1:[INSTANCE]
```

### Neon

```bash
DATABASE_URL=postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/dbname
```

## 🆘 Troubleshooting

### Import script fails with "path not found"

**Solution:** Adjust paths in `src/import/import-full.ts`:

```typescript
// Line ~340
const baseDir = path.join(__dirname, '../../data');
```

### "relation emission_factors does not exist"

**Solution:** Run database setup:

```bash
psql $DATABASE_URL -f database/schema.sql
```

### No emission factors imported (COUNT = 0)

**Solution:**
1. Check data files exist:
   ```bash
   ls -la data/concordances/
   ls -la data/baseline/
   ```

2. Re-run import:
   ```bash
   npm run import
   ```

### Queries are slow

**Solution:**
1. Check indexes exist:
   ```sql
   \di
   ```

2. Rebuild indexes:
   ```sql
   REINDEX TABLE emission_factors;
   ```

3. Analyze table:
   ```sql
   ANALYZE emission_factors;
   ```

## 📞 Support

- **Documentation:** `docs/` folder
- **Examples:** `examples/` folder
- **Issues:** Create GitHub issue
- **License:** CC BY-SA 4.0 (see LICENSE.md)

---

**Estimated installation time:** 5-10 minutes
**Difficulty:** Easy
**Support:** Full documentation included

✅ **Ready to integrate emission calculations into your SaaS!**
