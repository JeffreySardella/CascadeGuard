# CascadeGuard Static Build — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained static web app at cascadeguard.sardella.dev where users enter medications, see prescribing cascade chains visualized interactively, and download a doctor card PDF.

**Architecture:** Next.js 14 static export (`output: 'export'`). All cascade detection runs client-side against pre-collected data (65 PIPC patterns, 138 FAERS drug files, 13,603 autocomplete names). React Flow for interactive graph visualization, jsPDF for PDF generation.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS (WCAG AA palette), @xyflow/react, Fuse.js, jsPDF, framer-motion, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-24-cascadeguard-static-build-design.md`

---

## Chunk 1: Scaffold Cleanup & Build Infrastructure

### Task 1: Remove deprecated files and dependencies

**Files:**
- Delete: `src/app/api/analyze/route.ts`
- Delete: `src/components/AIExplanation.tsx`
- Delete: `src/data/fallbacks/margaret.json` (and `src/data/fallbacks/` directory)
- Delete: `.env.local.example`
- Delete: `public/manifest.json`
- Modify: `package.json`

- [ ] **Step 1: Delete deprecated files**

```bash
rm src/app/api/analyze/route.ts
rmdir src/app/api/analyze
rmdir src/app/api
rm src/components/AIExplanation.tsx
rm src/data/fallbacks/margaret.json
rmdir src/data/fallbacks
rm .env.local.example
rm public/manifest.json
```

- [ ] **Step 2: Remove @google/generative-ai from package.json**

In `package.json`, remove the line `"@google/generative-ai": "^0.21.0"` from dependencies.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove AI dependency, API route, demo data, and PWA manifest"
```

---

### Task 2: Configure Next.js for static export

**Files:**
- Modify: `next.config.js`
- Modify: `src/app/layout.tsx`
- Create: `public/_headers`
- Modify: `.gitignore`

- [ ] **Step 1: Rewrite next.config.js for static export**

Replace the entire contents of `next.config.js` with:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
```

Notes:
- `output: 'export'` produces static HTML/CSS/JS in `out/`
- `images.unoptimized` is required because the Next.js image optimizer needs a server
- `headers()` is removed — incompatible with static export

- [ ] **Step 2: Create Cloudflare Pages _headers file**

Create `public/_headers`:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
```

- [ ] **Step 3: Clean up layout.tsx**

Modify `src/app/layout.tsx` — remove manifest reference and fixed footer:

```tsx
import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'CascadeGuard — Are your medications treating side effects of each other?',
  description:
    'Detect prescribing cascades in your medication list using FDA adverse event data and 65 expert-validated patterns.',
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Changes from current:
- Removed `manifest: '/manifest.json'` from metadata
- Removed entire fixed-position `<footer>` element (disclaimer moves to page-level components)

- [ ] **Step 4: Add public/data/ to .gitignore**

Append to `.gitignore`:

```
# Build artifacts — copied from src/data/ by prebuild script
public/data/

# Next.js static export output
out/
```

- [ ] **Step 5: Commit**

```bash
git add next.config.js src/app/layout.tsx public/_headers .gitignore
git commit -m "chore: configure Next.js static export and Cloudflare headers"
```

---

### Task 3: Create prebuild data copy script

**Files:**
- Create: `scripts/copy-data.js`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create scripts/copy-data.js**

```javascript
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'data');
const DEST = path.join(__dirname, '..', 'public', 'data');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.name.endsWith('.json')) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean previous build artifacts
if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true });
}

// Copy specific files and directories
const filesToCopy = [
  'pipc-patterns.json',
  'rxnorm-index.json',
  'rxnorm-displaynames.json',
];

fs.mkdirSync(DEST, { recursive: true });

for (const file of filesToCopy) {
  fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
}

// Copy faers directory
copyDir(path.join(SRC, 'faers'), path.join(DEST, 'faers'));

console.log(`Copied data files to ${DEST}`);
```

- [ ] **Step 2: Update package.json scripts**

Replace the scripts section in `package.json`:

```json
"scripts": {
  "prebuild": "node scripts/copy-data.js",
  "dev": "node scripts/copy-data.js && next dev",
  "build": "node scripts/copy-data.js && next build",
  "start": "next start"
}
```

- [ ] **Step 3: Test the prebuild script**

Run: `node scripts/copy-data.js`

Expected: "Copied data files to ..." message. Verify `public/data/pipc-patterns.json`, `public/data/rxnorm-index.json`, `public/data/rxnorm-displaynames.json`, and `public/data/faers/` directory all exist.

- [ ] **Step 4: Commit**

```bash
git add scripts/copy-data.js package.json
git commit -m "feat: add prebuild script to copy data files to public/"
```

---

### Task 4: Update TypeScript types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Remove aiExplanation from AnalysisResult**

In `src/lib/types.ts`, update the `AnalysisResult` interface. Remove `aiExplanation: string;` and remove `legitimateDrugs` and `potentialReduction` from `summary` (these were AI-generated):

```typescript
/**
 * Shared TypeScript types for CascadeGuard
 */

export interface CascadePattern {
  id: string;
  system: string;
  drugClassA: string;
  drugExamplesA: string[];
  sideEffect: string;
  sideEffectMeddra: string;
  drugClassB: string;
  drugExamplesB: string[];
  recommendation: string;
  severity: 'high' | 'medium' | 'low';
}

export interface NormalizedMedication {
  rawInput: string;
  genericName: string;
  rxcui: string;
  drugClass: string;
  brandNames: string[];
}

export interface DetectedCascade {
  pattern: CascadePattern;
  drugA: NormalizedMedication;
  drugB: NormalizedMedication;
  faersCount: number;
  severity: 'high' | 'medium' | 'low';
}

export interface CascadeChain {
  chainId: number;
  depth: number;
  description: string;
  steps: {
    drugA: string;
    sideEffect: string;
    faersCount: number;
    drugB: string;
  }[];
  drugs: string[];
  alternative: string;
}

export interface AnalysisResult {
  medications: NormalizedMedication[];
  cascades: DetectedCascade[];
  chains: CascadeChain[];
  impactStatement: string;
  summary: {
    totalMedications: number;
    cascadesDetected: number;
    chainsDetected: number;
    maxChainDepth: number;
    drugsInCascades: number;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "chore: remove AI fields from AnalysisResult type"
```

---

### Task 5: Install dependencies and verify build

- [ ] **Step 1: Install dependencies**

Run: `npm install`

Expected: Successful install (the removed @google/generative-ai will no longer be in node_modules after next clean install, but that's fine — it's just removed from package.json).

- [ ] **Step 2: Run the dev server to verify no build errors**

Run: `npm run dev`

Expected: Next.js dev server starts without errors. The page should load at http://localhost:3000 showing the existing stub content.

- [ ] **Step 3: Test static export**

Run: `npm run build`

Expected: Build succeeds and produces an `out/` directory with static HTML. Verify `out/index.html` exists and `out/data/pipc-patterns.json` exists.

- [ ] **Step 4: Commit if any changes were needed**

---

## Chunk 2: Detection Engine (class-map, data-loader, cascade-engine)

### Task 6: Create the PIPC-to-RxNorm class mapping

**Files:**
- Create: `src/lib/class-map.ts`

- [ ] **Step 1: Create src/lib/class-map.ts**

This maps every unique drugClassA and drugClassB value from `pipc-patterns.json` to the corresponding RxNorm MeSH class(es) from `rxnorm-index.json`. Classes without a direct RxNorm mapping get an empty array (detection falls through to drug-example matching).

```typescript
/**
 * Maps PIPC clinical class names to RxNorm/MeSH pharmacological class names.
 * Used by the cascade detection engine to bridge vocabularies.
 *
 * PIPC uses clinical shorthand (e.g., "Calcium Channel Blocker")
 * RxNorm uses MeSH pharmacological classes (e.g., "L-Calcium Channel Receptor Antagonists")
 */

// PIPC class → RxNorm MeSH class(es)
export const PIPC_TO_RXNORM: Record<string, string[]> = {
  // --- drugClassA entries (trigger drugs) ---
  'ACE Inhibitor': ['Angiotensin-converting Enzyme Inhibitors'],
  'Acitretin': [], // Retinoid — no RxNorm class in our index, use example matching
  'Alpha-1 Receptor Blocker': ['Adrenergic alpha1-Antagonists'],
  'Anticholinergic Antiemetic': ['Cholinergic Muscarinic Antagonists'],
  'Anticonvulsant': ['Sodium Channel Interactions', 'GABA A Receptor Interactions'],
  'Antidopaminergic Antiemetic': ['Dopamine Antagonists'],
  'Antihypertensive': [
    'Angiotensin-converting Enzyme Inhibitors',
    'L-Calcium Channel Receptor Antagonists',
    'Adrenergic beta1-Antagonists',
    'Sodium Chloride Symporter Inhibitors',
    'Adrenergic alpha1-Antagonists',
  ],
  'Antipsychotic': ['Dopamine Antagonists'],
  'Benzodiazepine': ['GABA A Modulators'],
  'Beta-blocker (lipophilic)': ['Adrenergic beta1-Antagonists'],
  'Bisphosphonate': ['Bone Surface Interactions'],
  'Calcium Channel Blocker': ['L-Calcium Channel Receptor Antagonists'],
  'Carbapenem': ['Transpeptidase Inhibitors'],
  'Cholinesterase Inhibitor': ['Cholinesterase Inhibitors'],
  'Corticosteroid': ['Glucocorticoid Receptor Agonists'],
  'DPP-4 Inhibitor': ['Dipeptidyl Peptidase 4 Inhibitors'],
  'Digoxin': ['Sodium-Potassium Exchanging ATPase Interactions'],
  'Diuretic': [
    'Sodium Chloride Symporter Inhibitors',
    'Sodium Potassium Chloride Symporter Inhibitors',
    'Aldosterone Antagonists',
  ],
  'Dopaminergic Antiparkinsonian Agent': ['Dopamine Receptor Interactions'],
  'Erythromycin': ['Protein Synthesis Inhibitors'],
  'Fludrocortisone': ['Mineralocorticoid Receptor Agonists'],
  'Flunarizine': ['Calcium Channel Antagonists'],
  'Gabapentinoid': ['GABA A Receptor Interactions'],
  'Iron Supplement': ['Electrolyte Activity'],
  'Laxative': ['Stool Bulking Activity', 'Surfactant Activity'],
  'Lithium': [], // Unique mechanism, use example matching
  'Metformin': [], // Specific drug, use example matching
  'Midodrine': ['Adrenergic alpha1-Agonists'],
  'NSAID': ['Cyclooxygenase Inhibitors', 'Cyclooxygenase 2 Inhibitors'],
  'Opioid': ['Full Opioid Agonists', 'Opioid mu-Receptor Agonists', 'Opioid Agonists'],
  'Proton Pump Inhibitor': ['Proton Pump Inhibitors'],
  'Rosiglitazone': [], // Specific drug, use example matching
  'SGLT-2 Inhibitor': ['Sodium-Glucose Transporter 2 Inhibitors'],
  'SSRI/SNRI': ['Serotonin Uptake Inhibitors', 'Norepinephrine Uptake Inhibitors', 'Serotonin Transporter Interactions'],
  'Statin (HMG-CoA Reductase Inhibitor)': ['Hydroxymethylglutaryl-CoA Reductase Inhibitors'],
  'Thiazolidinedione': ['Insulin Receptor Agonists'],
  'Tricyclic Antidepressant': ['Norepinephrine Uptake Inhibitors'],
  'Urinary Anticholinergic': ['Cholinergic Muscarinic Antagonists'],
  'Venlafaxine': ['Serotonin Uptake Inhibitors', 'Norepinephrine Uptake Inhibitors'],

  // --- drugClassB entries (cascade result drugs) ---
  'Anti-gout Agent': ['Xanthine Oxidase Inhibitors'],
  'Anti-tremor Antimuscarinic': ['Cholinergic Muscarinic Antagonists'],
  'Antiarrhythmic': [], // Multiple mechanism types, use example matching
  'Antidepressant': ['Serotonin Uptake Inhibitors', 'Norepinephrine Uptake Inhibitors'],
  'Antidiarrheal': [], // Use example matching
  'Antidiarrheal Agent': [], // Use example matching
  'Antiemetic': ['Dopamine Antagonists', 'Serotonin 5HT-3 Antagonists'],
  'Antifungal': ['14-alpha Demethylase Inhibitors', 'Ergosterol Synthesis Inhibitors'],
  'Antihistamine': ['Histamine H1 Receptor Antagonists'],
  'Antihyperglycemic': [], // Broad class, use example matching
  'Antiparkinsonian Agent': ['Dopamine Receptor Interactions'],
  'Beta-blocker': ['Adrenergic beta1-Antagonists'],
  'Bismuth Subsalicylate': [], // Specific drug, use example matching
  'Cough Remedy': [], // Mixed mechanisms, use example matching
  'Gastroprotective Agent': ['Proton Pump Inhibitors'],
  'Heart Failure Agent': [], // Multiple classes, use example matching
  'Mineral Supplement': ['Electrolyte Activity'],
  'Overactive Bladder Medication': ['Cholinergic Muscarinic Antagonists', 'Adrenergic beta3-Agonists'],
  'PDE-5 Inhibitor': ['Phosphodiesterase 5 Inhibitors'],
  'Pain Reliever': ['Cyclooxygenase Inhibitors'],
  'Quinine Sulfate': [], // Specific drug, use example matching
  'Saliva Substitute': [], // Non-pharmacological, use example matching
  'Sedative': ['GABA A Modulators'],
  'Sleep Agent': ['GABA A Modulators', 'Orexin Receptor Antagonists'],
  'Topical Corticosteroid': ['Glucocorticoid Receptor Agonists'],
  'Vestibular Suppressant': ['Histamine H1 Receptor Antagonists'],
  'Vitamin/Calcium Supplement': [], // Non-pharmacological, use example matching
  'Vitamin/Mineral Supplement': [], // Non-pharmacological, use example matching
};

/**
 * Build reverse lookup: RxNorm class → PIPC classes
 * Used to check if a drug's RxNorm class matches any PIPC pattern class.
 */
export const RXNORM_TO_PIPC: Record<string, string[]> = {};
for (const [pipcClass, rxnormClasses] of Object.entries(PIPC_TO_RXNORM)) {
  for (const rxnormClass of rxnormClasses) {
    if (!RXNORM_TO_PIPC[rxnormClass]) {
      RXNORM_TO_PIPC[rxnormClass] = [];
    }
    RXNORM_TO_PIPC[rxnormClass].push(pipcClass);
  }
}

/**
 * Check if a drug's RxNorm class matches a PIPC pattern class.
 */
export function rxnormClassMatchesPipc(
  rxnormClass: string,
  pipcClass: string
): boolean {
  const mappedRxnormClasses = PIPC_TO_RXNORM[pipcClass];
  if (!mappedRxnormClasses || mappedRxnormClasses.length === 0) {
    return false;
  }
  return mappedRxnormClasses.includes(rxnormClass);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/class-map.ts
git commit -m "feat: add PIPC-to-RxNorm class mapping for cascade detection"
```

---

### Task 7: Create the data loader

**Files:**
- Create: `src/lib/data-loader.ts`

- [ ] **Step 1: Create src/lib/data-loader.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data-loader.ts
git commit -m "feat: add data loader with caching for patterns, RxNorm, and FAERS"
```

---

### Task 8: Create the cascade detection engine

**Files:**
- Create: `src/lib/cascade-engine.ts`

- [ ] **Step 1: Create src/lib/cascade-engine.ts**

```typescript
import type {
  NormalizedMedication,
  CascadePattern,
  DetectedCascade,
  CascadeChain,
  AnalysisResult,
} from './types';
import { rxnormClassMatchesPipc } from './class-map';
import { loadPatterns, loadFaersData } from './data-loader';

/**
 * Check if a medication matches the "A" side of a pattern
 * (by class mapping OR by drug example name).
 */
function matchesDrugA(med: NormalizedMedication, pattern: CascadePattern): boolean {
  if (rxnormClassMatchesPipc(med.drugClass, pattern.drugClassA)) {
    // For lipophilic beta-blockers, also check the specific drug list
    if (pattern.drugClassA === 'Beta-blocker (lipophilic)') {
      return pattern.drugExamplesA.includes(med.genericName);
    }
    return true;
  }
  return pattern.drugExamplesA.includes(med.genericName);
}

/**
 * Check if a medication matches the "B" side of a pattern.
 */
function matchesDrugB(med: NormalizedMedication, pattern: CascadePattern): boolean {
  if (rxnormClassMatchesPipc(med.drugClass, pattern.drugClassB)) {
    return true;
  }
  return pattern.drugExamplesB.includes(med.genericName);
}

/**
 * Main detection function.
 * Takes normalized medications, returns full analysis result.
 */
export async function detectCascades(
  medications: NormalizedMedication[]
): Promise<AnalysisResult> {
  const patterns = await loadPatterns();
  const cascades: DetectedCascade[] = [];

  // Step 1: Check all ordered pairs for pattern matches
  for (const medA of medications) {
    for (const medB of medications) {
      if (medA.genericName === medB.genericName) continue;

      for (const pattern of patterns) {
        if (matchesDrugA(medA, pattern) && matchesDrugB(medB, pattern)) {
          // Load FAERS data for drugA to check side effect prevalence
          const faersResults = await loadFaersData(medA.genericName);
          const faersMatch = faersResults.find(
            (r) => r.term === pattern.sideEffectMeddra
          );

          cascades.push({
            pattern,
            drugA: medA,
            drugB: medB,
            faersCount: faersMatch?.count ?? 0,
            severity: pattern.severity,
          });
          break; // One pattern match per (medA, medB) pair is enough
        }
      }
    }
  }

  // Step 2: Build chains — link cascades where one's drugB is another's drugA
  const chains = buildChains(cascades);

  // Step 3: Build summary
  const drugsInCascades = new Set<string>();
  for (const c of cascades) {
    drugsInCascades.add(c.drugA.genericName);
    drugsInCascades.add(c.drugB.genericName);
  }

  const maxChainDepth = chains.length > 0
    ? Math.max(...chains.map((c) => c.depth))
    : 0;

  const impactStatement =
    cascades.length === 0
      ? 'No known prescribing cascades detected among your medications.'
      : `${drugsInCascades.size} of your ${medications.length} medications may be part of prescribing cascades.`;

  return {
    medications,
    cascades,
    chains,
    impactStatement,
    summary: {
      totalMedications: medications.length,
      cascadesDetected: cascades.length,
      chainsDetected: chains.length,
      maxChainDepth,
      drugsInCascades: drugsInCascades.size,
    },
  };
}

/**
 * Link cascades into chains where cascade1.drugB === cascade2.drugA.
 */
function buildChains(cascades: DetectedCascade[]): CascadeChain[] {
  if (cascades.length === 0) return [];

  // Build adjacency: drugA.genericName -> cascade
  const byDrugA = new Map<string, DetectedCascade[]>();
  for (const c of cascades) {
    const key = c.drugA.genericName;
    if (!byDrugA.has(key)) byDrugA.set(key, []);
    byDrugA.get(key)!.push(c);
  }

  // Find chain starts: drugs that are drugA but not drugB in any cascade
  const allDrugBs = new Set(cascades.map((c) => c.drugB.genericName));
  const chainStarts = cascades.filter(
    (c) => !allDrugBs.has(c.drugA.genericName)
  );

  const chains: CascadeChain[] = [];
  let chainId = 1;

  for (const start of chainStarts) {
    const steps: CascadeChain['steps'] = [];
    const drugs: string[] = [start.drugA.genericName];
    let current: DetectedCascade | undefined = start;

    while (current) {
      steps.push({
        drugA: current.drugA.genericName,
        sideEffect: current.pattern.sideEffect,
        faersCount: current.faersCount,
        drugB: current.drugB.genericName,
      });
      drugs.push(current.drugB.genericName);

      // Find next cascade in chain
      const nextCascades = byDrugA.get(current.drugB.genericName);
      current = nextCascades?.[0];
    }

    // Only report chains with 2+ steps (otherwise it's just a single cascade)
    if (steps.length >= 2) {
      chains.push({
        chainId: chainId++,
        depth: drugs.length, // Count drugs, not steps (3 drugs = 3-drug chain)
        description: drugs.join(' → '),
        steps,
        drugs,
        alternative: start.pattern.recommendation,
      });
    }
  }

  return chains;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cascade-engine.ts
git commit -m "feat: implement client-side cascade detection engine"
```

---

## Chunk 3: Drug Input Component

### Task 9: Implement the DrugInput component

**Files:**
- Modify: `src/components/DrugInput.tsx`

- [ ] **Step 1: Implement DrugInput with Fuse.js autocomplete**

Replace the entire contents of `src/components/DrugInput.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Fuse from 'fuse.js';
import { X, Search } from 'lucide-react';
import type { NormalizedMedication } from '@/lib/types';
import { loadDisplayNames, loadRxNormIndex } from '@/lib/data-loader';

interface DrugInputProps {
  onMedicationsChange: (meds: NormalizedMedication[]) => void;
  onUnmatchedChange: (unmatched: string[]) => void;
  medications: NormalizedMedication[];
  unmatchedDrugs: string[];
}

export default function DrugInput({ onMedicationsChange, onUnmatchedChange, medications, unmatchedDrugs }: DrugInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [fuse, setFuse] = useState<Fuse<string> | null>(null);
  const [rxnormIndex, setRxnormIndex] = useState<Record<string, { rxcui: string; drugClass: string }> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Load data on mount
  useEffect(() => {
    async function init() {
      const [names, index] = await Promise.all([
        loadDisplayNames(),
        loadRxNormIndex(),
      ]);
      setFuse(new Fuse(names, { threshold: 0.3 }));
      setRxnormIndex(index);
    }
    init();
  }, []);

  const search = useCallback(
    (value: string) => {
      if (!fuse || value.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      const results = fuse.search(value, { limit: 7 });
      const filtered = results
        .map((r) => r.item)
        .filter(
          (name) =>
            !medications.some(
              (m) => m.genericName === name.toLowerCase() || m.rawInput === name
            )
        );
      setSuggestions(filtered);
      setHighlightedIndex(-1);
      setIsOpen(filtered.length > 0);
    },
    [fuse, medications]
  );

  function normalizeDrug(displayName: string): NormalizedMedication | null {
    if (!rxnormIndex) return null;
    const lower = displayName.toLowerCase();

    // Direct match by generic name
    const entry = rxnormIndex[lower];
    if (entry) {
      return {
        rawInput: displayName,
        genericName: lower,
        rxcui: entry.rxcui,
        drugClass: entry.drugClass,
        brandNames: [],
      };
    }

    // Brand name lookup: the display name might be a brand name.
    // rxnorm-displaynames.json includes brand names, but rxnorm-index.json
    // is keyed by generic name. Search for which generic drug lists this
    // as a brand name by checking all rxnorm/{drug}.json files at build time
    // would be expensive. Instead, since autocomplete shows all 13,603 names
    // but only ~138 are in our index, return a partial match with unknown class.
    // The cascade engine will still try example-name matching as fallback.
    return null;
  }

  function selectDrug(name: string) {
    const normalized = normalizeDrug(name);
    if (normalized && !medications.some((m) => m.genericName === normalized.genericName)) {
      onMedicationsChange([...medications, normalized]);
    } else if (!normalized && !unmatchedDrugs.includes(name)) {
      onUnmatchedChange([...unmatchedDrugs, name]);
    }
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function removeDrug(genericName: string) {
    onMedicationsChange(medications.filter((m) => m.genericName !== genericName));
  }

  function removeUnmatched(name: string) {
    onUnmatchedChange(unmatchedDrugs.filter((n) => n !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      selectDrug(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <label htmlFor="drug-search" className="block text-lg font-medium text-gray-700 mb-2">
        Enter your medications
      </label>

      {/* Medication chips */}
      {medications.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {medications.map((med) => (
            <span
              key={med.genericName}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-cascade-trigger-bg text-cascade-trigger rounded-full text-base font-medium"
            >
              {med.genericName}
              <button
                onClick={() => removeDrug(med.genericName)}
                className="ml-1 p-0.5 rounded-full hover:bg-green-200 transition-colors min-h-0 min-w-0"
                aria-label={`Remove ${med.genericName}`}
              >
                <X size={16} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          id="drug-search"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Start typing a medication name..."
          className="w-full pl-10 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-cascade-primary focus:ring-2 focus:ring-cascade-primary/20 focus:outline-none"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="drug-suggestions"
          aria-activedescendant={
            highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
          }
        />

        {/* Suggestions dropdown */}
        {isOpen && (
          <ul
            ref={listRef}
            id="drug-suggestions"
            role="listbox"
            className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((name, i) => (
              <li
                key={name}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                className={`px-4 py-3 cursor-pointer text-base ${
                  i === highlightedIndex
                    ? 'bg-cascade-primary text-white'
                    : 'hover:bg-gray-50'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectDrug(name);
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the component renders in the dev server**

Run: `npm run dev`

Navigate to http://localhost:3000. The input should appear (though it won't be wired into the page yet — that's Task 13).

- [ ] **Step 3: Commit**

```bash
git add src/components/DrugInput.tsx
git commit -m "feat: implement DrugInput with Fuse.js autocomplete and medication chips"
```

---

## Chunk 4: Results Components (CascadeCard, ChainCallout, ResultsSection)

### Task 10: Create CascadeCard and ChainCallout components

**Files:**
- Create: `src/components/CascadeCard.tsx`
- Create: `src/components/ChainCallout.tsx`

- [ ] **Step 1: Create src/components/CascadeCard.tsx**

```tsx
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { DetectedCascade } from '@/lib/types';

const SEVERITY_STYLES = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-amber-100 text-amber-800 border-amber-300',
  low: 'bg-yellow-50 text-yellow-800 border-yellow-300',
} as const;

const SEVERITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const;

export default function CascadeCard({ cascade }: { cascade: DetectedCascade }) {
  return (
    <div className="border-2 border-gray-200 rounded-lg p-5 bg-white">
      {/* Severity badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold border ${SEVERITY_STYLES[cascade.severity]}`}
        >
          <AlertTriangle size={14} />
          {SEVERITY_LABELS[cascade.severity]} severity
        </span>
        <span className="text-sm text-gray-500">{cascade.pattern.system}</span>
      </div>

      {/* Cascade flow */}
      <div className="flex flex-wrap items-center gap-2 text-lg mb-3">
        <span className="font-semibold text-cascade-trigger">
          {cascade.drugA.genericName}
        </span>
        <ArrowRight size={18} className="text-gray-400 flex-shrink-0" />
        <span className="font-medium text-cascade-side-effect">
          {cascade.pattern.sideEffect}
        </span>
        <ArrowRight size={18} className="text-gray-400 flex-shrink-0" />
        <span className="font-semibold text-cascade-result">
          {cascade.drugB.genericName}
        </span>
      </div>

      {/* FAERS data */}
      {cascade.faersCount > 0 && (
        <p className="text-sm text-gray-600 mb-2">
          {cascade.faersCount.toLocaleString()} FDA adverse event reports for{' '}
          {cascade.pattern.sideEffect.toLowerCase()} with {cascade.drugA.genericName}
        </p>
      )}

      {/* Recommendation */}
      <div className="mt-3 p-3 bg-blue-50 rounded-md">
        <p className="text-sm text-cascade-primary">
          <span className="font-semibold">Recommendation:</span>{' '}
          {cascade.pattern.recommendation}
        </p>
      </div>

      <p className="mt-2 text-xs text-gray-400 italic">
        Potential cascade identified based on published research (PIPC list)
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create src/components/ChainCallout.tsx**

```tsx
import { Link } from 'lucide-react';
import type { CascadeChain } from '@/lib/types';

export default function ChainCallout({ chain }: { chain: CascadeChain }) {
  return (
    <div className="border-2 border-cascade-primary/30 bg-blue-50 rounded-lg p-4">
      <div className="flex items-start gap-2">
        <Link size={20} className="text-cascade-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-cascade-primary text-lg">
            {chain.depth}-drug chain detected
          </p>
          <p className="text-base text-gray-700 mt-1">{chain.description}</p>
          {chain.alternative && (
            <p className="text-sm text-gray-600 mt-2">
              <span className="font-medium">Consider:</span> {chain.alternative}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CascadeCard.tsx src/components/ChainCallout.tsx
git commit -m "feat: add CascadeCard and ChainCallout result components"
```

---

### Task 11: Create ResultsSection component

**Files:**
- Create: `src/components/ResultsSection.tsx`

- [ ] **Step 1: Create src/components/ResultsSection.tsx**

```tsx
'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { AnalysisResult } from '@/lib/types';
import CascadeCard from './CascadeCard';
import ChainCallout from './ChainCallout';
import CascadeVisualization from './CascadeVisualization';
import DoctorCard from './DoctorCard';

interface ResultsSectionProps {
  result: AnalysisResult;
  unmatchedDrugs: string[];
}

export default function ResultsSection({ result, unmatchedDrugs }: ResultsSectionProps) {
  const { cascades, chains, summary, impactStatement } = result;

  return (
    <section className="w-full max-w-4xl" aria-label="Analysis results">
      {/* Unmatched drug warning */}
      {unmatchedDrugs.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle size={20} className="text-cascade-warning mt-0.5 flex-shrink-0" />
          <p className="text-cascade-warning">
            We couldn&apos;t identify: {unmatchedDrugs.join(', ')}. Try the generic name.
          </p>
        </div>
      )}

      {/* No cascades */}
      {cascades.length === 0 && (
        <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg text-center">
          <CheckCircle size={32} className="text-cascade-safe mx-auto mb-2" />
          <p className="text-lg font-semibold text-cascade-safe">
            No known prescribing cascades detected among your medications.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            This tool checks against 65 expert-validated patterns. It does not cover
            all possible drug interactions.
          </p>
        </div>
      )}

      {/* Cascades found */}
      {cascades.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg mb-6">
            <p className="text-lg font-semibold text-cascade-result">
              Found {summary.cascadesDetected} potential prescribing cascade
              {summary.cascadesDetected !== 1 ? 's' : ''} involving{' '}
              {summary.drugsInCascades} of your {summary.totalMedications} medications
            </p>
            <p className="text-base text-gray-700 mt-1">{impactStatement}</p>
          </div>

          {/* Visualization */}
          <div className="mb-6">
            <CascadeVisualization cascades={cascades} chains={chains} />
          </div>

          {/* Chain callouts */}
          {chains.length > 0 && (
            <div className="space-y-3 mb-6">
              {chains.map((chain) => (
                <ChainCallout key={chain.chainId} chain={chain} />
              ))}
            </div>
          )}

          {/* Individual cascade cards */}
          <div className="space-y-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Detailed Findings</h3>
            {cascades.map((cascade, i) => (
              <CascadeCard key={`${cascade.drugA.genericName}-${cascade.drugB.genericName}-${i}`} cascade={cascade} />
            ))}
          </div>

          {/* Doctor Card download */}
          <DoctorCard result={result} />
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ResultsSection.tsx
git commit -m "feat: add ResultsSection orchestrating cascade display"
```

---

## Chunk 5: Visualization (React Flow)

### Task 12: Implement CascadeVisualization with React Flow

**Files:**
- Modify: `src/components/CascadeVisualization.tsx`

- [ ] **Step 1: Implement the React Flow visualization**

Replace the entire contents of `src/components/CascadeVisualization.tsx`:

```tsx
'use client';

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  Position,
} from '@xyflow/react';
import type { DetectedCascade, CascadeChain } from '@/lib/types';

interface CascadeVisualizationProps {
  cascades: DetectedCascade[];
  chains: CascadeChain[];
}

const DRUG_NODE_STYLE = {
  background: '#dcfce7',
  color: '#166534',
  border: '2px solid #166534',
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: 600,
  minWidth: '120px',
  textAlign: 'center' as const,
};

const EFFECT_NODE_STYLE = {
  background: '#ffedd5',
  color: '#9a3412',
  border: '2px solid #9a3412',
  borderRadius: '20px',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 500,
  minWidth: '100px',
  textAlign: 'center' as const,
};

export default function CascadeVisualization({
  cascades,
  chains,
}: CascadeVisualizationProps) {
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const edgeList: Edge[] = [];

    // Track which column each drug appears in for layout
    let col = 0;

    for (const cascade of cascades) {
      const drugAId = `drug-${cascade.drugA.genericName}`;
      const drugBId = `drug-${cascade.drugB.genericName}`;
      const effectId = `effect-${cascade.drugA.genericName}-${cascade.pattern.sideEffect}`;

      // Drug A node
      if (!nodeMap.has(drugAId)) {
        nodeMap.set(drugAId, {
          id: drugAId,
          type: 'default',
          position: { x: col * 280, y: 0 },
          data: { label: cascade.drugA.genericName },
          style: DRUG_NODE_STYLE,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }

      // Side effect node
      if (!nodeMap.has(effectId)) {
        nodeMap.set(effectId, {
          id: effectId,
          type: 'default',
          position: { x: col * 280 + 180, y: 60 },
          data: {
            label: cascade.faersCount > 0
              ? `${cascade.pattern.sideEffect}\n(${cascade.faersCount.toLocaleString()} reports)`
              : cascade.pattern.sideEffect,
          },
          style: EFFECT_NODE_STYLE,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }

      // Drug B node
      if (!nodeMap.has(drugBId)) {
        nodeMap.set(drugBId, {
          id: drugBId,
          type: 'default',
          position: { x: (col + 1) * 280 + 80, y: 0 },
          data: { label: cascade.drugB.genericName },
          style: DRUG_NODE_STYLE,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      }

      // Edge: Drug A → side effect
      edgeList.push({
        id: `e-${drugAId}-${effectId}`,
        source: drugAId,
        target: effectId,
        label: 'causes',
        animated: true,
        style: { stroke: '#9a3412' },
        labelStyle: { fontSize: 11, fill: '#9a3412' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9a3412' },
      });

      // Edge: side effect → Drug B
      edgeList.push({
        id: `e-${effectId}-${drugBId}`,
        source: effectId,
        target: drugBId,
        label: 'treated with',
        animated: true,
        style: { stroke: '#991b1b' },
        labelStyle: { fontSize: 11, fill: '#991b1b' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#991b1b' },
      });

      col++;
    }

    return { nodes: Array.from(nodeMap.values()), edges: edgeList };
  }, [cascades]);

  if (cascades.length === 0) return null;

  return (
    <div
      className="w-full h-[400px] md:h-[500px] border-2 border-gray-200 rounded-lg bg-white"
      role="img"
      aria-label={`Cascade visualization showing ${cascades.length} prescribing cascade${cascades.length !== 1 ? 's' : ''} among your medications`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CascadeVisualization.tsx
git commit -m "feat: implement React Flow cascade visualization with animated edges"
```

---

## Chunk 6: Doctor Card PDF, Static Page Sections, Main Page Assembly

### Task 13: Implement DoctorCard PDF generation

**Files:**
- Modify: `src/components/DoctorCard.tsx`

- [ ] **Step 1: Implement DoctorCard with jsPDF**

Replace the entire contents of `src/components/DoctorCard.tsx`:

```tsx
'use client';

import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { AnalysisResult } from '@/lib/types';

interface DoctorCardProps {
  result: AnalysisResult;
}

export default function DoctorCard({ result }: DoctorCardProps) {
  function generatePDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CascadeGuard — Medication Cascade Report', pageWidth / 2, y, {
      align: 'center',
    });
    y += 10;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, {
      align: 'center',
    });
    y += 15;

    // Medication list
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Medications Entered:', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    for (const med of result.medications) {
      doc.text(`• ${med.genericName}`, 25, y);
      y += 6;
    }
    y += 5;

    // Cascades
    if (result.cascades.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Potential Prescribing Cascades Identified (${result.cascades.length}):`,
        20,
        y
      );
      y += 10;

      for (const cascade of result.cascades) {
        // Check for page overflow
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(
          `${cascade.drugA.genericName} → ${cascade.pattern.sideEffect} → ${cascade.drugB.genericName}`,
          25,
          y
        );
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Severity: ${cascade.severity}`, 30, y);
        y += 5;

        if (cascade.faersCount > 0) {
          doc.text(
            `FDA adverse event reports: ${cascade.faersCount.toLocaleString()}`,
            30,
            y
          );
          y += 5;
        }

        doc.text(`Recommendation: ${cascade.pattern.recommendation}`, 30, y, {
          maxWidth: pageWidth - 55,
        });
        y += 10;
      }
    }

    // Chains
    if (result.chains.length > 0) {
      y += 5;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Linked Chains:', 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      for (const chain of result.chains) {
        doc.text(`• ${chain.description} (${chain.depth}-drug chain)`, 25, y);
        y += 6;
      }
    }

    // Footer / Disclaimer — ensure it's below content
    if (y > 255) {
      doc.addPage();
      y = 20;
    }
    const footerY = Math.max(y + 15, 275);
    doc.setDrawColor(200);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Generated by CascadeGuard (cascadeguard.sardella.dev). Based on published PIPC cascade patterns',
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );
    doc.text(
      '(European Geriatric Medicine, 2025). This is not medical advice — discuss with your healthcare provider.',
      pageWidth / 2,
      footerY + 4,
      { align: 'center' }
    );

    doc.save('cascadeguard-report.pdf');
  }

  if (result.cascades.length === 0) return null;

  return (
    <div className="text-center">
      <button
        onClick={generatePDF}
        className="inline-flex items-center gap-2 px-6 py-3 bg-cascade-primary text-white font-semibold rounded-lg hover:bg-cascade-primary-hover transition-colors text-lg"
        aria-label="Download a PDF summary to bring to your doctor"
      >
        <Download size={20} />
        Download Doctor Card (PDF)
      </button>
      <p className="text-sm text-gray-500 mt-2">
        Print this and bring it to your next doctor&apos;s appointment
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DoctorCard.tsx
git commit -m "feat: implement DoctorCard PDF generation with jsPDF"
```

---

### Task 14: Create static page sections (Hero, Disclaimer, HowItWorks, Footer)

**Files:**
- Create: `src/components/HeroSection.tsx`
- Create: `src/components/DisclaimerBanner.tsx`
- Create: `src/components/HowItWorks.tsx`
- Create: `src/components/Footer.tsx`

- [ ] **Step 1: Create src/components/HeroSection.tsx**

```tsx
import { ChevronDown } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="text-center py-16 px-4">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 max-w-3xl mx-auto leading-tight">
        Are your medications causing side effects that lead to more medications?
      </h1>
      <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
        65% of adults over 65 take 5+ medications. Up to 1 in 3 new prescriptions
        in seniors may be treating side effects of existing drugs.
      </p>
      <p className="mt-4 text-base text-gray-500 max-w-xl mx-auto">
        A prescribing cascade happens when a medication&apos;s side effect is mistaken
        for a new condition — and treated with yet another drug.
      </p>
      <a
        href="#tool"
        className="inline-flex items-center gap-1 mt-8 px-6 py-3 bg-cascade-primary text-white font-semibold rounded-lg hover:bg-cascade-primary-hover transition-colors text-lg"
      >
        Check Your Medications
        <ChevronDown size={20} />
      </a>
    </section>
  );
}
```

- [ ] **Step 2: Create src/components/DisclaimerBanner.tsx**

```tsx
import { Info } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="w-full max-w-4xl mx-auto mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
      <Info size={20} className="text-cascade-primary mt-0.5 flex-shrink-0" />
      <p className="text-sm text-gray-700">
        CascadeGuard is an educational tool based on published medical research. It
        does not provide medical advice, diagnosis, or treatment. Always consult your
        healthcare provider before making any changes to your medications.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create src/components/HowItWorks.tsx**

```tsx
import { Search, Database, GitBranch } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: 'Pattern Matching',
      description:
        'Your medications are checked against 65 prescribing cascade patterns identified by an international expert panel (12 experts, 8 countries, endorsed by the European Geriatric Medicine Society).',
    },
    {
      icon: Database,
      title: 'FDA Validation',
      description:
        'Each potential cascade is cross-referenced against FDA adverse event reports (FAERS database) to validate that the side effects linking your medications are well-documented.',
    },
    {
      icon: GitBranch,
      title: 'Chain Detection',
      description:
        'When one cascade leads to another (Drug A → Drug B → Drug C), CascadeGuard links them into chains to show the full picture of how medications may be compounding.',
    },
  ];

  return (
    <section className="py-16 px-4 bg-gray-50">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
        How It Works
      </h2>
      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
        {steps.map((step) => (
          <div key={step.title} className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-cascade-primary/10 rounded-full mb-4">
              <step.icon size={24} className="text-cascade-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {step.title}
            </h3>
            <p className="text-base text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create src/components/Footer.tsx**

```tsx
export default function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto text-center text-sm text-gray-500 space-y-2">
        <p>
          This is an educational screening tool, not medical advice. Do not change
          medications without consulting your physician.
        </p>
        <p>
          Cascade patterns from the{' '}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12712104/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cascade-primary underline hover:text-cascade-primary-hover"
          >
            PIPC list
          </a>{' '}
          (European Geriatric Medicine, 2025). FDA data from{' '}
          <a
            href="https://open.fda.gov/apis/drug/event/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cascade-primary underline hover:text-cascade-primary-hover"
          >
            openFDA FAERS
          </a>
          .
        </p>
        <p className="text-gray-400">
          Built by Jeff Sardella &middot; &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/HeroSection.tsx src/components/DisclaimerBanner.tsx src/components/HowItWorks.tsx src/components/Footer.tsx
git commit -m "feat: add Hero, Disclaimer, HowItWorks, and Footer components"
```

---

### Task 15: Assemble the main page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace page.tsx with full page assembly**

Replace the entire contents of `src/app/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { NormalizedMedication, AnalysisResult } from '@/lib/types';
import { detectCascades } from '@/lib/cascade-engine';
import HeroSection from '@/components/HeroSection';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import DrugInput from '@/components/DrugInput';
import ResultsSection from '@/components/ResultsSection';
import HowItWorks from '@/components/HowItWorks';
import Footer from '@/components/Footer';

export default function Home() {
  const [medications, setMedications] = useState<NormalizedMedication[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [unmatchedDrugs, setUnmatchedDrugs] = useState<string[]>([]);

  async function handleAnalyze() {
    if (medications.length < 2) return;
    setIsAnalyzing(true);
    try {
      const analysisResult = await detectCascades(medications);
      setResult(analysisResult);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleMedicationsChange(meds: NormalizedMedication[]) {
    setMedications(meds);
    setResult(null); // Clear previous results when meds change
  }

  function handleUnmatchedChange(unmatched: string[]) {
    setUnmatchedDrugs(unmatched);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <HeroSection />

      <section id="tool" className="flex flex-col items-center px-4 py-12">
        <DisclaimerBanner />

        <DrugInput
          medications={medications}
          unmatchedDrugs={unmatchedDrugs}
          onMedicationsChange={handleMedicationsChange}
          onUnmatchedChange={handleUnmatchedChange}
        />

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={medications.length < 2 || isAnalyzing}
          className="mt-6 px-8 py-3 bg-cascade-primary text-white font-semibold rounded-lg hover:bg-cascade-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cascade-primary transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze My Medications'}
        </button>

        {medications.length === 1 && (
          <p className="mt-2 text-sm text-gray-500">
            Add at least one more medication to analyze
          </p>
        )}

        {/* Results */}
        {result && (
          <div className="mt-10 w-full flex justify-center">
            <ResultsSection result={result} unmatchedDrugs={unmatchedDrugs} />
          </div>
        )}
      </section>

      <HowItWorks />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: assemble main page with all components wired together"
```

---

## Chunk 7: Final Build Verification

### Task 16: Verify static build and clean up

- [ ] **Step 1: Remove the CascadeSimpleView stub if it exists**

Check if `src/components/CascadeSimpleView.tsx` exists. If so, delete it (it was planned for the hackathon but isn't in our spec).

- [ ] **Step 2: Run dev server and test manually**

Run: `npm run dev`

Test flow:
1. Page loads with hero section
2. Type "amlodipine" in the input → suggestions appear
3. Select amlodipine, then add "furosemide" and "lisinopril" and "benzonatate" and "allopurinol"
4. Click "Analyze My Medications"
5. Should see cascade results with React Flow graph
6. Click "Download Doctor Card" → PDF downloads
7. Check mobile view (resize browser to <768px)

- [ ] **Step 3: Run static build**

Run: `npm run build`

Expected: Build succeeds, `out/` directory created with `index.html` and `data/` directory.

- [ ] **Step 4: Test static build locally**

Run: `npx serve out`

Navigate to http://localhost:3000. Full flow should work the same as dev server.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and build verification"
```
