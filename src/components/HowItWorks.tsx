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
