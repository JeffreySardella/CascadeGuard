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
