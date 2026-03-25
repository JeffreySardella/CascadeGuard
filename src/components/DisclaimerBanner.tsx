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
