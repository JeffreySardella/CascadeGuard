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
    setResult(null);
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
