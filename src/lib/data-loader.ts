import type { CascadePattern } from './types';

interface RxNormIndexEntry {
  rxcui: string;
  drugClass: string;
}

interface FaersResult {
  term: string;
  count: number;
}

interface FaersData {
  drug: string;
  fetchedAt: string;
  results: FaersResult[];
}

// In-memory caches
let patternsCache: CascadePattern[] | null = null;
let rxnormIndexCache: Record<string, RxNormIndexEntry> | null = null;
let displayNamesCache: string[] | null = null;
let brandMapCache: Record<string, string> | null = null;
const faersCache: Record<string, FaersResult[]> = {};

export async function loadPatterns(): Promise<CascadePattern[]> {
  if (patternsCache) return patternsCache;
  const res = await fetch('/data/pipc-patterns.json');
  const data = await res.json();
  patternsCache = data.patterns as CascadePattern[];
  return patternsCache;
}

export async function loadRxNormIndex(): Promise<Record<string, RxNormIndexEntry>> {
  if (rxnormIndexCache) return rxnormIndexCache;
  const res = await fetch('/data/rxnorm-index.json');
  rxnormIndexCache = await res.json();
  return rxnormIndexCache!;
}

export async function loadDisplayNames(): Promise<string[]> {
  if (displayNamesCache) return displayNamesCache;
  const res = await fetch('/data/rxnorm-displaynames.json');
  displayNamesCache = await res.json();
  return displayNamesCache!;
}

export async function loadBrandToGeneric(): Promise<Record<string, string>> {
  if (brandMapCache) return brandMapCache;
  const res = await fetch('/data/brand-to-generic.json');
  brandMapCache = await res.json();
  return brandMapCache!;
}

export async function loadFaersData(genericName: string): Promise<FaersResult[]> {
  const fileName = genericName.replace(/ /g, '_');
  if (faersCache[fileName]) return faersCache[fileName];

  try {
    const res = await fetch(`/data/faers/${fileName}.json`);
    if (!res.ok) {
      faersCache[fileName] = [];
      return [];
    }
    const data: FaersData = await res.json();
    faersCache[fileName] = data.results;
    return data.results;
  } catch {
    faersCache[fileName] = [];
    return [];
  }
}
