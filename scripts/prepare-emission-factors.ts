import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface RawBaselineRecord {
  nace_code: string;
  nace_description: string;
  emission_factor_kgco2e_per_eur: string;
  total_output_eur: string;
  num_countries: string;
  example_sectors: string;
  data_source: string;
  year: string;
}

interface RawConcordanceRecord {
  NACE2: string;
  "EXIOBASE name": string;
  "EXIOBASE code": string;
}

interface NaceSection {
  code: string;
  name: string;
}

interface RangeStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p10: number;
  p90: number;
}

interface EmissionFactorRecord {
  naceCode: string;
  naceDivision: string;
  naceDescription: string;
  displayName: string;
  section: NaceSection;
  emissionFactorKgCO2ePerEUR: number;
  emissionFactorTonnesCO2ePerMEUR: number;
  emissionFactorNormalized: number;
  totalOutputEUR: number;
  totalOutputMEUR: number;
  totalOutputNormalized: number;
  numCountries: number;
  dataSource: string;
  year: number;
  exampleSectors: string[];
  exiobaseActivities: string[];
  exiobaseCodes: string[];
  longDescription: string;
}

interface DatasetMetadata {
  generatedAt: string;
  recordCount: number;
  ranges: {
    emissionFactorKgCO2ePerEUR: RangeStats & { unit: string };
    totalOutputEUR: RangeStats & { unit: string };
    numCountries: RangeStats & { unit: string };
  };
  sectorSummaries: Array<{
    section: NaceSection;
    emissionFactorRange: RangeStats;
    totalOutputRange: RangeStats;
  }>;
  sources: string[];
  notes: string[];
}

interface PreparedDataset {
  metadata: DatasetMetadata;
  records: EmissionFactorRecord[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ZIP_PATH = path.join(PROJECT_ROOT, 'EmissionFactorDatabase-Portable.zip');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'dashboard', 'public', 'data', 'emission_factors.json');

const NACE_SECTIONS: Array<{ section: NaceSection; ranges: Array<[number, number]> }> = [
  { section: { code: 'A', name: 'Agriculture, forestry and fishing' }, ranges: [[1, 3]] },
  { section: { code: 'B', name: 'Mining and quarrying' }, ranges: [[5, 9]] },
  { section: { code: 'C', name: 'Manufacturing' }, ranges: [[10, 33]] },
  { section: { code: 'D', name: 'Electricity, gas, steam and air conditioning supply' }, ranges: [[35, 35]] },
  { section: { code: 'E', name: 'Water supply; sewerage, waste management and remediation activities' }, ranges: [[36, 39]] },
  { section: { code: 'F', name: 'Construction' }, ranges: [[41, 43]] },
  { section: { code: 'G', name: 'Wholesale and retail trade; repair of motor vehicles and motorcycles' }, ranges: [[45, 47]] },
  { section: { code: 'H', name: 'Transportation and storage' }, ranges: [[49, 53]] },
  { section: { code: 'I', name: 'Accommodation and food service activities' }, ranges: [[55, 56]] },
  { section: { code: 'J', name: 'Information and communication' }, ranges: [[58, 63]] },
  { section: { code: 'K', name: 'Financial and insurance activities' }, ranges: [[64, 66]] },
  { section: { code: 'L', name: 'Real estate activities' }, ranges: [[68, 68]] },
  { section: { code: 'M', name: 'Professional, scientific and technical activities' }, ranges: [[69, 75]] },
  { section: { code: 'N', name: 'Administrative and support service activities' }, ranges: [[77, 82]] },
  { section: { code: 'O', name: 'Public administration and defence; compulsory social security' }, ranges: [[84, 84]] },
  { section: { code: 'P', name: 'Education' }, ranges: [[85, 85]] },
  { section: { code: 'Q', name: 'Human health and social work activities' }, ranges: [[86, 88]] },
  { section: { code: 'R', name: 'Arts, entertainment and recreation' }, ranges: [[90, 93]] },
  { section: { code: 'S', name: 'Other service activities' }, ranges: [[94, 96]] },
  { section: { code: 'T', name: 'Activities of households as employers; undifferentiated goods- and services-producing activities of households for own use' }, ranges: [[97, 98]] },
  { section: { code: 'U', name: 'Activities of extraterritorial organisations and bodies' }, ranges: [[99, 99]] }
];

function getZipEntryContent(zip: AdmZip, parts: string[]): string {
  const normalizedTarget = parts.join('/').toLowerCase();
  const entry = zip.getEntries().find((candidate) => candidate.entryName.replace(/\\/g, '/').toLowerCase() === normalizedTarget);

  if (!entry) {
    throw new Error(`Unable to locate ${parts.join('/')} in ${ZIP_PATH}`);
  }

  return entry.getData().toString('utf-8');
}

function toNumber(value: string): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const sanitized = value.replace(/[^0-9.+-eE]/g, '');
  const fallback = Number(sanitized);
  if (Number.isFinite(fallback)) {
    return fallback;
  }

  throw new Error(`Unable to parse numeric value from "${value}"`);
}

function normaliseNaceCode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split('.');
  const majorPart = parts[0]?.padStart(2, '0');
  if (!majorPart) {
    return null;
  }

  if (parts.length === 1 || parts[1] === undefined || parts[1] === '') {
    return majorPart;
  }

  const minorPart = parts[1].padEnd(2, '0');
  return `${majorPart}.${minorPart}`;
}

function determineSection(naceCode: string): NaceSection {
  const majorPart = Number.parseInt(naceCode.split('.')[0] ?? '', 10);
  if (!Number.isFinite(majorPart)) {
    return { code: 'NA', name: 'Not classified' };
  }

  for (const { section, ranges } of NACE_SECTIONS) {
    if (ranges.some(([start, end]) => majorPart >= start && majorPart <= end)) {
      return section;
    }
  }

  return { code: 'NA', name: 'Not classified' };
}

function computeQuantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const index = (sortedValues.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = index - lower;
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * weight;
}

function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function computeRangeStats(values: number[]): RangeStats {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p10: 0, p90: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mean = sum / sorted.length;

  return {
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
    mean: round(mean),
    median: round(computeQuantile(sorted, 0.5)),
    p10: round(computeQuantile(sorted, 0.1)),
    p90: round(computeQuantile(sorted, 0.9))
  };
}

function normalise(value: number, range: RangeStats): number {
  if (range.max === range.min) {
    return 0.5;
  }

  const normalised = (value - range.min) / (range.max - range.min);
  return round(Math.min(Math.max(normalised, 0), 1), 6);
}

function buildLongDescription(description: string, exampleSectors: string[]): string {
  if (exampleSectors.length === 0) {
    return description;
  }

  return `${description} (e.g. ${exampleSectors.join(', ')})`;
}

async function prepareDataset(): Promise<PreparedDataset> {
  const zip = new AdmZip(ZIP_PATH);

  const baselineCsv = getZipEntryContent(zip, [
    'EmissionFactorDatabase-Portable',
    'data',
    'baseline',
    'nace_emission_factors_2022.csv'
  ]);

  let concordanceCsv: string | null = null;
  try {
    concordanceCsv = getZipEntryContent(zip, [
      'EmissionFactorDatabase-Portable',
      'data',
      'concordances',
      'NACE2_EXIOBASE20p_list.csv'
    ]);
  } catch (error) {
    concordanceCsv = null;
  }

  const rawBaselineRecords = parse<RawBaselineRecord>(baselineCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const concordanceMap = new Map<string, { names: Set<string>; codes: Set<string> }>();

  if (concordanceCsv) {
    const rawConcordanceRecords = parse<RawConcordanceRecord>(concordanceCsv, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    for (const record of rawConcordanceRecords) {
      const normalised = normaliseNaceCode(record.NACE2);
      if (!normalised) {
        continue;
      }

      const bucket = concordanceMap.get(normalised) ?? {
        names: new Set<string>(),
        codes: new Set<string>()
      };

      if (record['EXIOBASE name']) {
        bucket.names.add(record['EXIOBASE name']);
      }

      if (record['EXIOBASE code']) {
        bucket.codes.add(record['EXIOBASE code']);
      }

      concordanceMap.set(normalised, bucket);
    }
  }

  const parsedRecords: EmissionFactorRecord[] = rawBaselineRecords.map((raw) => {
    const naceCode = raw.nace_code.trim();
    const exampleSectors = raw.example_sectors
      .split(';')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const emissionFactor = toNumber(raw.emission_factor_kgco2e_per_eur);
    const totalOutput = toNumber(raw.total_output_eur);
    const numCountries = Number.parseInt(raw.num_countries, 10);

    const section = determineSection(naceCode);
    const concordance = concordanceMap.get(naceCode) ?? concordanceMap.get(normaliseNaceCode(naceCode) ?? '') ?? {
      names: new Set<string>(),
      codes: new Set<string>()
    };

    const naceDivision = naceCode.split('.')[0] ?? naceCode;
    const record: EmissionFactorRecord = {
      naceCode,
      naceDivision,
      naceDescription: raw.nace_description.trim(),
      displayName: `${naceCode} — ${raw.nace_description.trim()}`,
      section,
      emissionFactorKgCO2ePerEUR: round(emissionFactor),
      emissionFactorTonnesCO2ePerMEUR: round(emissionFactor * 1000),
      emissionFactorNormalized: 0,
      totalOutputEUR: round(totalOutput),
      totalOutputMEUR: round(totalOutput / 1_000_000),
      totalOutputNormalized: 0,
      numCountries: Number.isFinite(numCountries) ? numCountries : 0,
      dataSource: raw.data_source.trim(),
      year: Number.parseInt(raw.year, 10),
      exampleSectors,
      exiobaseActivities: Array.from(concordance.names).sort(),
      exiobaseCodes: Array.from(concordance.codes).sort(),
      longDescription: ''
    };

    record.longDescription = buildLongDescription(record.naceDescription, record.exampleSectors);

    return record;
  });

  const emissionFactorRange = computeRangeStats(parsedRecords.map((record) => record.emissionFactorKgCO2ePerEUR));
  const totalOutputRange = computeRangeStats(parsedRecords.map((record) => record.totalOutputEUR));
  const numCountriesRange = computeRangeStats(parsedRecords.map((record) => record.numCountries));

  for (const record of parsedRecords) {
    record.emissionFactorNormalized = normalise(record.emissionFactorKgCO2ePerEUR, emissionFactorRange);
    record.totalOutputNormalized = normalise(record.totalOutputEUR, totalOutputRange);
  }

  const sectorGroups = new Map<string, { section: NaceSection; records: EmissionFactorRecord[] }>();
  for (const record of parsedRecords) {
    const key = record.section.code;
    if (!sectorGroups.has(key)) {
      sectorGroups.set(key, { section: record.section, records: [] });
    }

    sectorGroups.get(key)?.records.push(record);
  }

  const sectorSummaries = Array.from(sectorGroups.values())
    .sort((a, b) => a.section.code.localeCompare(b.section.code))
    .map(({ section, records }) => ({
      section,
      emissionFactorRange: computeRangeStats(records.map((record) => record.emissionFactorKgCO2ePerEUR)),
      totalOutputRange: computeRangeStats(records.map((record) => record.totalOutputEUR))
    }));

  const sources = Array.from(new Set(parsedRecords.map((record) => record.dataSource))).sort();

  const metadata: DatasetMetadata = {
    generatedAt: new Date().toISOString(),
    recordCount: parsedRecords.length,
    ranges: {
      emissionFactorKgCO2ePerEUR: { ...emissionFactorRange, unit: 'kgCO2e/€' },
      totalOutputEUR: { ...totalOutputRange, unit: '€' },
      numCountries: { ...numCountriesRange, unit: 'countries' }
    },
    sectorSummaries,
    sources,
    notes: [
      'Emission intensities are provided in kilograms of CO2 equivalent per euro of output.',
      'Total output values and derived statistics are denominated in euros (current prices).',
      'Normalized fields are scaled between 0 and 1 using the observed minimum and maximum values to support visual encodings.'
    ]
  };

  return {
    metadata,
    records: parsedRecords
  };
}

async function ensureOutputDirectory(): Promise<void> {
  const outputDir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(outputDir, { recursive: true });
}

async function main(): Promise<void> {
  console.log('Preparing emission factor dataset...');
  await ensureOutputDirectory();

  const dataset = await prepareDataset();
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`, 'utf-8');

  console.log(`✔ Wrote ${dataset.records.length} records to ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error('Failed to prepare emission factor dataset.');
  console.error(error);
  process.exitCode = 1;
});
