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
