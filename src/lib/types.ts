/**
 * Shared TypeScript types for CascadeGuard
 * Used by both frontend and backend
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
  aiExplanation: string;
  summary: {
    totalMedications: number;
    cascadesDetected: number;
    chainsDetected: number;
    maxChainDepth: number;
    drugsInCascades: number;
    legitimateDrugs: string[];
    potentialReduction: string;
  };
}
