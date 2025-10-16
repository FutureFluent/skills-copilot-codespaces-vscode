# Integration Guide - Emission Factor Database

Complete guide for integrating the emission factor database into any SaaS solution.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Database Setup](#database-setup)
3. [Framework Integration](#framework-integration)
4. [Database Adapters](#database-adapters)
5. [Custom Configurations](#custom-configurations)
6. [Production Deployment](#production-deployment)

---

## Quick Start

### Minimum Requirements

- **PostgreSQL 12+** (or compatible: Supabase, Neon, AWS RDS, etc.)
- **Node.js 18+** (for import scripts)
- **~500MB disk space** (for emission factors table)

### Installation Steps

```bash
# 1. Extract the portable package
cd emission-factor-database-portable

# 2. Install dependencies
npm install

# 3. Set up database
psql $DATABASE_URL -f database/schema.sql

# 4. Import emission factors (~3 min)
export DATABASE_URL="postgresql://user:pass@host:5432/database"
npm run import

# 5. Verify installation
psql $DATABASE_URL -c "SELECT COUNT(*) FROM emission_factors;"
# Expected: ~44,394
```

---

## Database Setup

### Option 1: All-in-One Schema

```bash
# Single file contains everything
psql $DATABASE_URL -f database/schema.sql
```

### Option 2: Individual Migrations

```bash
# Run migrations one by one
psql $DATABASE_URL -f database/migrations/001_create_tables.sql
psql $DATABASE_URL -f database/migrations/002_add_country_fields.sql
psql $DATABASE_URL -f database/migrations/003_create_indexes.sql
```

### Verify Setup

```sql
-- Check tables exist
\dt

-- Expected tables:
--  emission_factors
--  nace_emission_factors
--  supplier_nace_mappings
--  vat_cache
--  emission_category_mappings

-- Check emission_factors structure
\d emission_factors

-- Verify indexes
\di
```

---

## Framework Integration

### 1. Next.js / React

#### Installation

```bash
npm install emission-factor-database
# or copy src/core/ into your project
```

#### API Route Example

```typescript
// app/api/emissions/calculate/route.ts
import { matchTransaction } from '@/lib/emission-matcher/core/matcher';
import { createPostgresAdapter } from '@/lib/emission-matcher/database/postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = createPostgresAdapter(pool);

export async function POST(request: Request) {
  const { transactions } = await request.json();

  const results = await Promise.all(
    transactions.map(tx => matchTransaction(tx, db))
  );

  return Response.json({
    results: results.map(r => ({
      transaction_id: r.transactionId,
      emissions: r.emissions,
      confidence: r.confidence,
      tier: r.tier
    }))
  });
}
```

#### React Component Example

```typescript
// components/EmissionsCalculator.tsx
'use client';

import { useState } from 'react';

export function EmissionsCalculator() {
  const [transactions, setTransactions] = useState([]);
  const [results, setResults] = useState(null);

  const calculateEmissions = async () => {
    const response = await fetch('/api/emissions/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions })
    });

    const data = await response.json();
    setResults(data.results);
  };

  return (
    <div>
      {/* Your UI */}
      <button onClick={calculateEmissions}>
        Calculate Emissions
      </button>

      {results && (
        <div>
          {results.map(r => (
            <div key={r.transaction_id}>
              <span>Emissions: {r.emissions} kg CO2e</span>
              <span>Confidence: {r.confidence}%</span>
              <span>Tier: {r.tier}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Node.js / Express

#### Installation

```bash
npm install pg csv-parse
# Copy src/core/ into your project
```

#### Route Example

```javascript
// routes/emissions.js
const express = require('express');
const { Pool } = require('pg');
const { matchTransaction } = require('../lib/emission-matcher');
const { createPostgresAdapter } = require('../lib/adapters/postgres');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = createPostgresAdapter(pool);

router.post('/calculate', async (req, res) => {
  try {
    const { transactions } = req.body;

    const results = await Promise.all(
      transactions.map(tx => matchTransaction(tx, db))
    );

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 3. NestJS

#### Module Example

```typescript
// emissions/emissions.module.ts
import { Module } from '@nestjs/common';
import { EmissionsService } from './emissions.service';
import { EmissionsController } from './emissions.controller';

@Module({
  providers: [EmissionsService],
  controllers: [EmissionsController],
})
export class EmissionsModule {}
```

#### Service Example

```typescript
// emissions/emissions.service.ts
import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { matchTransaction } from '../lib/emission-matcher';
import { createPostgresAdapter } from '../lib/adapters/postgres';

@Injectable()
export class EmissionsService {
  private db;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.db = createPostgresAdapter(pool);
  }

  async calculateEmissions(transactions: Transaction[]) {
    return Promise.all(
      transactions.map(tx => matchTransaction(tx, this.db))
    );
  }
}
```

### 4. Python / Django

#### Install Dependencies

```bash
pip install psycopg2-binary
```

#### Adapter Example

```python
# emissions/matcher.py
import psycopg2
from typing import Dict, Optional

class EmissionMatcher:
    def __init__(self, db_url: str):
        self.conn = psycopg2.connect(db_url)

    def match_transaction(self, transaction: Dict) -> Dict:
        cursor = self.conn.cursor()

        # Tier 1: Exact match
        cursor.execute("""
            SELECT *
            FROM emission_factors
            WHERE nace_code = %s
              AND country_code = %s
              AND is_active = true
            LIMIT 1
        """, (transaction['nace_code'], transaction['country_code']))

        result = cursor.fetchone()

        if result:
            return {
                'emission_factor': result[8],  # emission_factor_kgco2e_per_eur
                'tier': 1,
                'confidence': 0.95
            }

        # Add Tier 2, 3, 4 fallbacks...

        return {'emission_factor': None, 'tier': None}
```

#### View Example

```python
# emissions/views.py
from django.http import JsonResponse
from .matcher import EmissionMatcher
import os

matcher = EmissionMatcher(os.environ['DATABASE_URL'])

def calculate_emissions(request):
    transactions = request.POST.getlist('transactions')

    results = [
        matcher.match_transaction(tx)
        for tx in transactions
    ]

    return JsonResponse({'results': results})
```

### 5. Ruby on Rails

#### Adapter Example

```ruby
# lib/emission_matcher.rb
require 'pg'

class EmissionMatcher
  def initialize(db_url)
    @conn = PG.connect(db_url)
  end

  def match_transaction(transaction)
    # Tier 1: Exact match
    result = @conn.exec_params(
      "SELECT * FROM emission_factors
       WHERE nace_code = $1
         AND country_code = $2
         AND is_active = true
       LIMIT 1",
      [transaction[:nace_code], transaction[:country_code]]
    )

    return nil if result.ntuples == 0

    {
      emission_factor: result[0]['emission_factor_kgco2e_per_eur'].to_f,
      tier: 1,
      confidence: 0.95
    }
  end
end
```

#### Controller Example

```ruby
# app/controllers/emissions_controller.rb
class EmissionsController < ApplicationController
  def calculate
    matcher = EmissionMatcher.new(ENV['DATABASE_URL'])

    results = params[:transactions].map do |tx|
      matcher.match_transaction(tx.to_h.symbolize_keys)
    end

    render json: { results: results }
  end
end
```

---

## Database Adapters

### Creating a Custom Adapter

Implement the `DatabaseAdapter` interface for your database/ORM:

```typescript
// src/database/my-custom-adapter.ts
import type { DatabaseAdapter, EmissionFactor, EmissionFactorQuery } from '../core/types';

export function createMyCustomAdapter(client: any): DatabaseAdapter {
  return {
    async findEmissionFactor(query: EmissionFactorQuery): Promise<EmissionFactor | null> {
      // Your implementation
      const result = await client.query(
        `SELECT * FROM emission_factors
         WHERE nace_code = $1
           AND country_code = $2
           AND is_active = true
         LIMIT 1`,
        [query.nace_code, query.country_code]
      );

      return result.rows[0] || null;
    },

    async findEmissionFactors(query: EmissionFactorQuery): Promise<EmissionFactor[]> {
      // Your implementation
    },

    async getEmissionFactorById(id: string): Promise<EmissionFactor | null> {
      // Your implementation
    },

    async findNACEEmissionFactor(naceCode: string): Promise<any> {
      // Your implementation
    },

    async getVATCache(vatNumber: string): Promise<any> {
      // Your implementation
    },

    async getAccountMapping(companyId: string, accountCode: string): Promise<any> {
      // Your implementation
    },

    async getSupplierMapping(supplierNameNormalized: string): Promise<any> {
      // Your implementation
    },

    async incrementSupplierUsage(supplierId: string): Promise<void> {
      // Your implementation
    }
  };
}
```

### PostgreSQL Adapter (Built-in)

```typescript
// Example usage
import { Pool } from 'pg';
import { createPostgresAdapter } from './database/postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = createPostgresAdapter(pool);
```

### Prisma Adapter Example

```typescript
import { PrismaClient } from '@prisma/client';
import type { DatabaseAdapter } from '../core/types';

export function createPrismaAdapter(prisma: PrismaClient): DatabaseAdapter {
  return {
    async findEmissionFactor(query) {
      return await prisma.emission_factors.findFirst({
        where: {
          nace_code: query.nace_code,
          country_code: query.country_code,
          is_active: true,
          ...(query.product_hint && {
            exiobase_product_name: {
              contains: query.product_hint,
              mode: 'insensitive'
            }
          })
        }
      });
    },

    async findEmissionFactors(query) {
      return await prisma.emission_factors.findMany({
        where: {
          nace_code: query.nace_code,
          ...(query.country_code && { country_code: query.country_code }),
          ...(query.country_codes && { country_code: { in: query.country_codes } }),
          is_active: true
        }
      });
    },

    // Implement other methods...
  };
}
```

---

## Custom Configurations

### Adjusting Confidence Levels

```typescript
import { matchTransaction, DEFAULT_CONFIG } from './core/matcher';

const customConfig = {
  ...DEFAULT_CONFIG,
  confidenceLevels: {
    tier1: 0.98,  // Increased from 0.95
    tier2: 0.90,  // Increased from 0.85
    tier3: 0.80,  // Increased from 0.75
    tier4: 0.70   // Increased from 0.65
  }
};

const result = await matchTransaction(transaction, db, companyId, customConfig);
```

### Disabling Learning System

```typescript
const config = {
  ...DEFAULT_CONFIG,
  enableLearning: false  // Disable supplier usage increment
};
```

### Custom VAT Cache TTL

```typescript
const config = {
  ...DEFAULT_CONFIG,
  cacheTTL: 7 * 24 * 60 * 60 * 1000  // 7 days instead of 24 hours
};
```

---

## Production Deployment

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/database

# Optional
NODE_ENV=production
LOG_LEVEL=info
CACHE_TTL=86400000
ENABLE_LEARNING=true
```

### Database Optimization

#### Connection Pooling

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Maximum pool size
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 2000 // Timeout if no connection in 2s
});
```

#### Query Optimization

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Add missing indexes if needed
CREATE INDEX IF NOT EXISTS idx_custom
ON emission_factors(nace_code, country_code, exiobase_product_code);
```

#### Vacuum and Analyze

```sql
-- Regular maintenance
VACUUM ANALYZE emission_factors;
VACUUM ANALYZE supplier_nace_mappings;

-- Set up automatic vacuum (PostgreSQL.conf)
autovacuum = on
autovacuum_analyze_scale_factor = 0.05
```

### Caching Strategy

#### Application-Level Caching

```typescript
import { LRUCache } from 'lru-cache';

const emissionFactorCache = new LRUCache<string, EmissionFactor>({
  max: 10000,  // Cache 10,000 factors
  ttl: 1000 * 60 * 60  // 1 hour TTL
});

async function getCachedEmissionFactor(
  naceCode: string,
  countryCode: string,
  db: DatabaseAdapter
): Promise<EmissionFactor | null> {
  const cacheKey = `${naceCode}:${countryCode}`;

  // Check cache first
  const cached = emissionFactorCache.get(cacheKey);
  if (cached) return cached;

  // Fetch from database
  const factor = await db.findEmissionFactor({ nace_code: naceCode, country_code: countryCode });

  // Store in cache
  if (factor) {
    emissionFactorCache.set(cacheKey, factor);
  }

  return factor;
}
```

#### Redis Caching

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getRedisCachedFactor(
  naceCode: string,
  countryCode: string,
  db: DatabaseAdapter
): Promise<EmissionFactor | null> {
  const cacheKey = `ef:${naceCode}:${countryCode}`;

  // Check Redis
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const factor = await db.findEmissionFactor({ nace_code: naceCode, country_code: countryCode });

  // Store in Redis (1 hour TTL)
  if (factor) {
    await redis.setex(cacheKey, 3600, JSON.stringify(factor));
  }

  return factor;
}
```

### Monitoring

#### Query Performance Monitoring

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Check slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%emission_factors%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Application Metrics

```typescript
import { Counter, Histogram } from 'prom-client';

const matchCounter = new Counter({
  name: 'emission_matches_total',
  help: 'Total number of emission factor matches',
  labelNames: ['tier', 'method']
});

const matchLatency = new Histogram({
  name: 'emission_match_duration_seconds',
  help: 'Duration of emission factor matching',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

async function monitoredMatch(transaction: Transaction, db: DatabaseAdapter) {
  const start = Date.now();

  const result = await matchTransaction(transaction, db);

  const duration = (Date.now() - start) / 1000;
  matchLatency.observe(duration);

  if (result.tier) {
    matchCounter.inc({ tier: result.tier, method: result.method });
  }

  return result;
}
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump $DATABASE_URL \
  --table=emission_factors \
  --table=nace_emission_factors \
  --table=supplier_nace_mappings \
  --table=vat_cache \
  --table=emission_category_mappings \
  | gzip > backup_$DATE.sql.gz

# Keep last 30 days
find . -name "backup_*.sql.gz" -mtime +30 -delete
```

### Security Considerations

#### Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read emission factors"
ON emission_factors FOR SELECT
TO public
USING (is_active = true);

-- Restrict writes to admins only
CREATE POLICY "Only admins can modify"
ON emission_factors FOR ALL
TO authenticated
USING (current_user = 'admin')
WITH CHECK (current_user = 'admin');
```

#### API Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/api/emissions', limiter);
```

---

## Troubleshooting

### Issue: Import script fails

**Solution:**
```bash
# Check paths in import-full.ts
const baseDir = path.join(__dirname, '../../data');

# Verify data files exist
ls -la data/concordances/
ls -la data/baseline/
```

### Issue: Slow queries

**Solution:**
```sql
-- Check if indexes exist
\di

-- Rebuild indexes if needed
REINDEX TABLE emission_factors;

-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM emission_factors
WHERE nace_code = '35.11' AND country_code = 'SE';
```

### Issue: No matches found

**Solution:**
```sql
-- Verify data was imported
SELECT COUNT(*) FROM emission_factors;

-- Check specific NACE code exists
SELECT COUNT(*) FROM emission_factors WHERE nace_code = '35.11';

-- Verify account mappings exist
SELECT * FROM emission_category_mappings WHERE company_id = 'your_company_id';
```

---

## Support

- **Documentation:** See `docs/` folder for detailed guides
- **Examples:** See `examples/` folder for framework-specific code
- **Issues:** Report bugs and request features on GitHub
- **Community:** Join discussions and ask questions

---

**Version:** 2.0
**Last Updated:** October 15, 2025
**License:** CC BY-SA 4.0
