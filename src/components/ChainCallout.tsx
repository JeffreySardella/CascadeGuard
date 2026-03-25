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
