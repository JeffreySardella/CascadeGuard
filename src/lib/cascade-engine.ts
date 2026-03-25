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
