'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Fuse from 'fuse.js';
import { X, Search } from 'lucide-react';
import type { NormalizedMedication } from '@/lib/types';
import { loadDisplayNames, loadRxNormIndex, loadBrandToGeneric } from '@/lib/data-loader';

interface DrugInputProps {
  onMedicationsChange: (meds: NormalizedMedication[]) => void;
  onUnmatchedChange: (unmatched: string[]) => void;
  medications: NormalizedMedication[];
  unmatchedDrugs: string[];
}

export default function DrugInput({ onMedicationsChange, onUnmatchedChange, medications, unmatchedDrugs }: DrugInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [fuse, setFuse] = useState<Fuse<string> | null>(null);
  const [rxnormIndex, setRxnormIndex] = useState<Record<string, { rxcui: string; drugClass: string }> | null>(null);
  const [brandMap, setBrandMap] = useState<Record<string, string> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Load data on mount
  useEffect(() => {
    async function init() {
      const [names, index, brands] = await Promise.all([
        loadDisplayNames(),
        loadRxNormIndex(),
        loadBrandToGeneric(),
      ]);
      setFuse(new Fuse(names, { threshold: 0.3 }));
      setRxnormIndex(index);
      setBrandMap(brands);
    }
    init();
  }, []);

  const search = useCallback(
    (value: string) => {
      if (!fuse || value.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      const results = fuse.search(value, { limit: 7 });
      const filtered = results
        .map((r) => r.item)
        .filter(
          (name) =>
            !medications.some(
              (m) => m.genericName === name.toLowerCase() || m.rawInput === name
            )
        );
      setSuggestions(filtered);
      setHighlightedIndex(-1);
      setIsOpen(filtered.length > 0);
    },
    [fuse, medications]
  );

  function normalizeDrug(displayName: string): NormalizedMedication | null {
    if (!rxnormIndex) return null;
    const lower = displayName.toLowerCase();

    // Direct match by generic name
    const entry = rxnormIndex[lower];
    if (entry) {
      return {
        rawInput: displayName,
        genericName: lower,
        rxcui: entry.rxcui,
        drugClass: entry.drugClass,
        brandNames: [],
      };
    }

    // Brand name → generic name lookup
    if (brandMap) {
      const generic = brandMap[lower];
      if (generic && rxnormIndex[generic]) {
        const genericEntry = rxnormIndex[generic];
        return {
          rawInput: displayName,
          genericName: generic,
          rxcui: genericEntry.rxcui,
          drugClass: genericEntry.drugClass,
          brandNames: [displayName],
        };
      }
    }

    return null;
  }

  function selectDrug(name: string) {
    const normalized = normalizeDrug(name);
    if (normalized && !medications.some((m) => m.genericName === normalized.genericName)) {
      onMedicationsChange([...medications, normalized]);
    } else if (!normalized && !unmatchedDrugs.includes(name)) {
      onUnmatchedChange([...unmatchedDrugs, name]);
    }
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function removeDrug(genericName: string) {
    onMedicationsChange(medications.filter((m) => m.genericName !== genericName));
  }

  function removeUnmatched(name: string) {
    onUnmatchedChange(unmatchedDrugs.filter((n) => n !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      selectDrug(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <label htmlFor="drug-search" className="block text-lg font-medium text-gray-700 mb-2">
        Enter your medications
      </label>

      {/* Medication chips */}
      {(medications.length > 0 || unmatchedDrugs.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {medications.map((med) => (
            <span
              key={med.genericName}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-cascade-trigger-bg text-cascade-trigger rounded-full text-base font-medium"
            >
              {med.genericName}
              <button
                onClick={() => removeDrug(med.genericName)}
                className="ml-1 p-0.5 rounded-full hover:bg-green-200 transition-colors min-h-0 min-w-0"
                aria-label={`Remove ${med.genericName}`}
              >
                <X size={16} />
              </button>
            </span>
          ))}
          {unmatchedDrugs.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-base font-medium"
            >
              {name} (not found)
              <button
                onClick={() => removeUnmatched(name)}
                className="ml-1 p-0.5 rounded-full hover:bg-amber-200 transition-colors min-h-0 min-w-0"
                aria-label={`Remove ${name}`}
              >
                <X size={16} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          id="drug-search"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Start typing a medication name..."
          className="w-full pl-10 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-cascade-primary focus:ring-2 focus:ring-cascade-primary/20 focus:outline-none"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="drug-suggestions"
          aria-activedescendant={
            highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
          }
        />

        {/* Suggestions dropdown */}
        {isOpen && (
          <ul
            ref={listRef}
            id="drug-suggestions"
            role="listbox"
            className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((name, i) => (
              <li
                key={name}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                className={`px-4 py-3 cursor-pointer text-base ${
                  i === highlightedIndex
                    ? 'bg-cascade-primary text-white'
                    : 'hover:bg-gray-50'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectDrug(name);
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
