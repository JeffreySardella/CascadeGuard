/**
 * DrugInput — P1's component
 *
 * Autocomplete text field for medication entry.
 * Uses fuse.js + preloaded RxNorm displaynames (13,603 names).
 *
 * Requirements:
 * - Fuzzy search after 2 characters typed
 * - Shows top 5 suggestions in dropdown
 * - Added drugs appear as removable chips
 * - Keyboard navigable (arrow keys + Enter + Escape)
 * - Min touch target 44px (WCAG 2.5.8)
 * - "Analyze" button disabled until 2+ meds entered
 *
 * Data: import displaynames from @/data/rxnorm-displaynames.json
 */

'use client';

export default function DrugInput({
  onMedicationsChange,
}: {
  onMedicationsChange: (meds: string[]) => void;
}) {
  // TODO: P1 implements this
  return (
    <div className="w-full max-w-xl">
      <label htmlFor="drug-search" className="block text-lg font-medium text-gray-700 mb-2">
        Enter a medication
      </label>
      <input
        id="drug-search"
        type="text"
        placeholder="Start typing a medication name..."
        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-cascade-primary focus:ring-2 focus:ring-cascade-primary/20"
        autoComplete="off"
        aria-label="Search for a medication by name"
      />
    </div>
  );
}
