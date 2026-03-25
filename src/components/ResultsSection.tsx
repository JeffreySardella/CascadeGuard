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
