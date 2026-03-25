# CascadeGuard Static Build — Design Spec

## Overview

A self-contained static web app at `cascadeguard.sardella.dev` where anyone can type in their medications and see prescribing cascade chains. No backend, no login, no cost. Deployed independently to Cloudflare Pages on its own subdomain.

**Core value proposition:** Pattern-match a user's medication list against 65 expert-validated prescribing cascade patterns (PIPC list) and FDA adverse event data, then visualize the results and generate a printable doctor card.

## Architecture

### Build & Deploy

- **Framework:** Next.js 14 with `output: 'export'` in `next.config.js` (static HTML/CSS/JS)
- **Styling:** Tailwind CSS with existing WCAG AA color palette
- **Deploy target:** Cloudflare Pages, subdomain `cascadeguard.sardella.dev`
- **No backend, no API routes, no server-side logic** — all detection runs client-side in the browser

### What Gets Removed from Current Scaffold

- `src/app/api/analyze/route.ts` — server-side API route (detection moves client-side)
- `@google/generative-ai` dependency — no AI/LLM analysis
- `src/components/AIExplanation.tsx` — Gemini explanation card
- `src/data/fallbacks/margaret.json` — demo scenario (this is a real tool, not a demo)
- `.env.local.example` — no API keys needed
- `public/manifest.json` — no PWA (can revisit later)
- `manifest: '/manifest.json'` reference in `layout.tsx` metadata — prevents 404
- `headers()` function in `next.config.js` — incompatible with `output: 'export'`. Security headers move to a `public/_headers` file for Cloudflare Pages:
  ```
  /*
    X-Content-Type-Options: nosniff
    X-Frame-Options: DENY
  ```
- Fixed-position footer in `layout.tsx` — replaced by DisclaimerBanner and Footer components in the page itself
- `aiExplanation` field from `AnalysisResult` in `types.ts` — AI is removed

### What Gets Kept

- `src/data/pipc-patterns.json` — 65 cascade patterns
- `src/data/faers/*.json` — 138 pre-collected FDA adverse event files
- `src/data/rxnorm/*.json` — 138 drug metadata files
- `src/data/rxnorm-index.json` — drug name → class/RxCUI lookup
- `src/data/rxnorm-displaynames.json` — 13,603 names for autocomplete
- `src/lib/types.ts` — shared TypeScript interfaces (with modifications noted above)
- `tailwind.config.ts` — WCAG AA color palette
- All existing dependencies except `@google/generative-ai`

## Page Structure

### 1. Hero Section

Visible on load. Communicates the problem and invites action.

- **Headline:** "Are your medications causing side effects that lead to more medications?"
- **Stat line:** "65% of adults over 65 take 5+ medications. Up to 1 in 3 new prescriptions in seniors may be treating side effects of existing drugs."
- **Subtext:** One sentence explaining prescribing cascades
- **CTA:** Scroll-to or anchor to the tool section

### 2. Disclaimer Banner

Visible above the tool, before interaction. Not just footer text.

> "CascadeGuard is an educational tool based on published medical research. It does not provide medical advice, diagnosis, or treatment. Always consult your healthcare provider before making any changes to your medications."

### 3. Tool Section — Drug Input

- **Autocomplete text input** powered by Fuse.js fuzzy search against `rxnorm-displaynames.json` (13,603 names)
- User types a drug name → dropdown shows matches (generic + brand names)
- Selecting a match adds a **medication chip** to a list below the input
- Each chip shows the generic name and an × to remove
- **"Analyze My Medications" button** — disabled until 2+ medications are entered
- Normalize each selected drug: look up in `rxnorm-index.json` to get `genericName`, `rxcui`, `drugClass`

### 4. Results Section — Cascade Detection Output

Appears after clicking "Analyze." Three possible states:

**State A — No cascades found:**
- Green confirmation message: "No known prescribing cascades detected among your medications."
- Note: "This tool checks against 65 expert-validated patterns. It does not cover all possible drug interactions."

**State B — Cascades found:**
- Summary bar: "Found {n} potential prescribing cascade(s) involving {m} of your {total} medications"
- **Interactive React Flow graph** (see Visualization section)
- **Text summaries** below the graph — one card per detected cascade with:
  - Drug A → side effect → Drug B
  - FAERS report count (e.g., "8,359 FDA adverse event reports for this side effect")
  - Severity badge (high/medium/low)
  - Clinical recommendation from the pattern data
- **Chain callout** if cascades link together (e.g., "Amlodipine → Furosemide → Allopurinol forms a 3-drug chain")

**State C — Some drugs not recognized:**
- Warning banner for unmatched drugs: "We couldn't identify: {list}. Try the generic name."
- Still show results for matched drugs

### 5. Visualization — React Flow Interactive Graph

Uses `@xyflow/react` (already a dependency).

**Node types:**
- **Drug node** (green bg `#dcfce7`, green-800 text `#166534`) — each medication
- **Side-effect node** (orange bg `#ffedd5`, orange-800 text `#9a3412`) — the adverse effect linking two drugs

**Edge types:**
- Drug A → Side-effect: labeled "causes" with animated dots
- Side-effect → Drug B: labeled "treated with" with animated dots

**Layout:** Auto-layout left-to-right using dagre or manual positioning. Chains flow naturally: A → effect → B → effect → C.

**Interaction:** Nodes are draggable. Graph is pannable and zoomable. Clicking a node highlights its connected cascade.

**Responsive:** On mobile (<768px), the graph renders at a fixed smaller size with pinch-to-zoom. Text summaries below remain the primary view on mobile.

### 6. Doctor Card — PDF Download

"Download Doctor Card" button appears when cascades are found.

**PDF contents (jsPDF):**
- Header: "CascadeGuard — Medication Cascade Report"
- Date generated
- Patient's medication list
- Each detected cascade: Drug A → side effect → Drug B, with severity and recommendation
- Chain summary if applicable
- Footer: "Generated by CascadeGuard (cascadeguard.sardella.dev). Based on published PIPC cascade patterns. This is not medical advice — discuss with your healthcare provider."
- Source citation: PIPC list reference

### 7. How It Works Section

Brief methodology explanation:

- "CascadeGuard checks your medications against 65 prescribing cascade patterns identified by an international expert panel (12 experts, 8 countries, endorsed by the European Geriatric Medicine Society)."
- "It cross-references FDA adverse event reports (FAERS database) to validate that the side effects linking your medications are well-documented."
- "A prescribing cascade occurs when a medication causes a side effect that gets treated with another medication — instead of addressing the root cause."

### 8. Footer

- "Not medical advice" disclaimer (shorter repeat)
- Source: "Cascade patterns from the PIPC list (European Geriatric Medicine, 2025)"
- Link to the published paper
- "Built by Jeff Sardella"
- Copyright

## Detection Engine — Client-Side Logic

File: `src/lib/cascade-engine.ts` (new)

### Drug Class Mapping

The PIPC patterns use clinical shorthand class names (e.g., "Calcium Channel Blocker") while `rxnorm-index.json` uses RxNorm/MeSH pharmacological classes (e.g., "L-Calcium Channel Receptor Antagonists"). These won't match via string equality.

**Solution:** A static mapping table in `src/lib/class-map.ts` that maps each PIPC class name to its corresponding RxNorm MeSH class(es):

```typescript
// PIPC class → RxNorm MeSH class(es)
const CLASS_MAP: Record<string, string[]> = {
  "ACE Inhibitor": ["Angiotensin-converting Enzyme Inhibitors"],
  "Calcium Channel Blocker": ["L-Calcium Channel Receptor Antagonists"],
  "Beta-blocker (lipophilic)": ["Adrenergic beta1-Antagonists"],  // subset: metoprolol, propranolol only
  "Diuretic": ["Sodium Chloride Symporter Inhibitors", "Potassium Sparing Diuretics"],
  "NSAID": ["Cyclooxygenase Inhibitors"],
  "Statin (HMG-CoA Reductase Inhibitor)": ["Hydroxymethylglutaryl-CoA Reductase Inhibitors"],
  // ... one entry per PIPC drugClass (derived from all unique drugClassA/drugClassB values in pipc-patterns.json)
};
```

The detection algorithm uses this mapping to translate between vocabularies. Drug-example matching remains as a fallback for classes not yet mapped or for specificity (e.g., lipophilic beta-blockers are a subset of all beta-blockers).

### Algorithm

```
Input: list of NormalizedMedication[]
Output: AnalysisResult (cascades + chains + summary)

1. For each ORDERED pair (drugA, drugB) where drugA != drugB in the medication list
   (check both directions for each combination):
   a. Look up drugA.drugClass and drugB.drugClass from rxnorm-index
   b. Search pipc-patterns for a pattern where:
      - drugClassA matches drugA.drugClass via CLASS_MAP
        OR drugA.genericName is in drugExamplesA
      - AND drugClassB matches drugB.drugClass via CLASS_MAP
        OR drugB.genericName is in drugExamplesB
   c. If pattern found:
      - Load FAERS data for drugA (from pre-collected faers/{drugA}.json)
      - Check if the pattern's sideEffectMeddra appears in drugA's FAERS results
      - If found: record DetectedCascade with FAERS count
      - If not in FAERS but pattern matches: still record, with faersCount = 0
        (FAERS files contain only the top ~50 adverse events per drug, so some
        valid side effects may not appear — this is expected, not a bug)
   d. If FAERS fetch returns 404 (no pre-collected data for this drug):
      treat as faersCount = 0 for all patterns involving that drug.
      No error shown to the user — the pattern match alone is still valuable.

2. Build chains from detected cascades:
   - If cascade1.drugB === cascade2.drugA, link them into a chain
   - Calculate chain depth
   - Generate description
   - Set chain.alternative to the recommendation from the first pattern in the chain

3. Build summary:
   - Count cascades, chains, max depth
   - Identify drugs involved in cascades vs. not
   - Generate impact statement (e.g., "3 of your 6 medications may be part of prescribing cascades")
```

### Data Loading Strategy

The FAERS data is 138 individual JSON files (~2-5KB each).

**Chosen approach: Lazy-load per drug.** When the user clicks "Analyze," fetch only the FAERS files for the drugs they entered (typically 3-10 files, ~30KB total). This keeps initial page load fast and avoids loading 138 files upfront.

Implementation: `fetch('/data/faers/${genericName.replace(/ /g, '_')}.json')` at analysis time — note the space-to-underscore normalization for multi-word drug names (e.g., "bismuth subsalicylate" → `bismuth_subsalicylate.json`). Files are served from `public/data/faers/`.

The pattern file (`pipc-patterns.json`, ~40KB) and RxNorm index (`rxnorm-index.json`, ~15KB) load on page init since they're needed for autocomplete normalization. The display names file (`rxnorm-displaynames.json`, ~337KB) loads on page init for the autocomplete.

## Data Pipeline — Static Export

Data files in `src/data/` need to be available as static assets at runtime.

**Mechanism:** Add a `prebuild` npm script that copies data files into `public/data/`:

```json
{
  "scripts": {
    "prebuild": "node scripts/copy-data.js",
    "build": "npm run prebuild && next build",
    "dev": "npm run prebuild && next dev"
  }
}
```

`scripts/copy-data.js` copies:
- `src/data/pipc-patterns.json` → `public/data/pipc-patterns.json`
- `src/data/rxnorm-index.json` → `public/data/rxnorm-index.json`
- `src/data/rxnorm-displaynames.json` → `public/data/rxnorm-displaynames.json`
- `src/data/faers/*.json` → `public/data/faers/*.json`

The cascade engine fetches them at runtime via `fetch()`. This keeps the JS bundle small — data isn't bundled into the JavaScript.

`public/data/` is added to `.gitignore` since it's a build artifact derived from `src/data/`.

## Component Architecture

```
src/
├── app/
│   ├── layout.tsx              — root layout (head, fonts, global styles)
│   │                             Remove: fixed footer, manifest reference
│   └── page.tsx                — single page: hero + tool + results + how-it-works + footer
│
├── components/
│   ├── HeroSection.tsx         — headline, stats, CTA
│   ├── DisclaimerBanner.tsx    — legal disclaimer above tool
│   ├── DrugInput.tsx           — autocomplete input + medication chips (existing stub, implement)
│   ├── ResultsSection.tsx      — orchestrates results display
│   ├── CascadeVisualization.tsx — React Flow interactive graph (existing stub, implement)
│   ├── CascadeCard.tsx         — single cascade text summary card
│   ├── ChainCallout.tsx        — chain summary when cascades link
│   ├── DoctorCard.tsx          — PDF generation + download button (existing stub, implement)
│   ├── HowItWorks.tsx          — methodology section
│   └── Footer.tsx              — disclaimer + credits
│
├── lib/
│   ├── types.ts                — existing shared types (remove aiExplanation)
│   ├── cascade-engine.ts       — detection algorithm (new)
│   ├── class-map.ts            — PIPC → RxNorm class mapping (new)
│   └── data-loader.ts          — fetch/cache static JSON data (new)
│
├── data/                       — existing pre-collected data (copied to public/ at build)
│
└── scripts/
    └── copy-data.js            — prebuild data copy script
```

## Type Updates

Update `src/lib/types.ts`:
- Remove `aiExplanation: string` from `AnalysisResult`
- Set `CascadeChain.alternative` to be populated from the first pattern's `recommendation` field

## Legal & Disclaimers

Three-layer approach:

1. **Pre-tool disclaimer banner** — visible before any interaction, can't miss it
2. **Results caveat** — each result includes "potential cascade identified based on published research"
3. **Footer disclaimer** — standard "not medical advice" + source citation

Language uses "potential" and "identified by researchers," never "you have" or "diagnosis."

No data is collected, stored, or transmitted. Everything runs in the browser. No HIPAA concerns.

## Accessibility (WCAG AA)

Already configured in `tailwind.config.ts` and `globals.css`:

- All colors tested for 4.5:1+ contrast ratio on white
- Minimum 16px font size
- Minimum 44px touch targets
- Focus-visible outlines for keyboard navigation
- Semantic HTML throughout (headings, landmarks, aria-labels)
- React Flow graph has aria-label describing the cascade; text summaries below serve as accessible alternative

## Mobile Responsiveness

- Hero: stacks vertically, text centered
- Drug input: full-width, medication chips wrap
- React Flow graph: fixed-height container with pinch-to-zoom, horizontal scroll hint
- Text summaries: full-width cards, primary view on mobile
- Doctor Card button: full-width on mobile
- All touch targets minimum 44px

## Out of Scope

- AI/LLM analysis (Gemini integration removed)
- User accounts or saved medication lists
- Backend or database
- PWA (no offline mode for now)
- Drug-drug interaction checking (different from cascades)
- Pre-loaded demo scenarios
