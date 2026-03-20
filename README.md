# CascadeGuard

**Are your medications treating side effects of each other?**

CascadeGuard detects prescribing cascades — when Drug B was prescribed to treat a side effect of Drug A — by analyzing a patient's medication list against 65 expert-validated patterns and 28 million FDA drug-adverse event pairs. Built for Hornet Hacks 4.0 (March 20-22, 2026) by Team Bitme.

---

## The Problem

- **16% of older adults** take medications that exist solely to treat side effects of other medications
- **43% of older adults** take 5+ medications
- When patients report symptoms known as drug reactions, **almost half of doctors say there's no connection**
- The only existing tool (ThinkCascades) is clinician-only and covers just 9 patterns
- **No patient-facing tool exists**

## The Solution

Patients or caregivers enter a medication list → CascadeGuard cross-references 65 expert-validated cascade patterns + real FDA adverse event data → visualizes hidden cascade chains → generates a Doctor Card PDF to bring to their physician.

**In our demo: 6 medications become 3.**

---

## Quick Start

```bash
# 1. Install Node.js if you don't have it
#    Download from https://nodejs.org (LTS version)

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.local.example .env.local
# Add your Gemini API key (free at https://aistudio.google.com/apikey)

# 4. Run dev server
npm run dev
# Opens at http://localhost:3000
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 + TypeScript |
| Styling | Tailwind CSS (WCAG AA color palette) |
| Visualization | React Flow (`@xyflow/react`) + Framer Motion |
| Fuzzy Search | fuse.js (client-side autocomplete) |
| AI | Gemini 2.5 Flash (free tier — plain-language explanations) |
| PDF | jsPDF (client-side Doctor Card generation) |
| Icons | lucide-react |
| Deploy | Vercel |

---

## Data Sources (all pre-collected, zero live API dependency for demo)

| Source | What | Size |
|--------|------|------|
| `data/faers/` | FDA adverse event report counts per drug | 138 drugs |
| `data/rxnorm/` | Drug names, RxCUI, drug classes, brand names | 138 drugs |
| `data/rxnorm-displaynames.json` | Autocomplete drug names | 13,603 names |
| `data/pipc-patterns.json` | 65 expert-validated cascade patterns (PIPC list, 2025 Delphi consensus) | 65 patterns |
| `data/onsides/onsides.db` | OnSIDES drug-adverse event pairs (SQLite) | 28.1M pairs, 2,562 ingredients |
| `data/fallbacks/margaret.json` | Pre-cached demo scenario | Complete analysis result |

**Data sources are public government APIs:** openFDA FAERS, RxNorm (NIH), OnSIDES (Tatonetti Lab, Columbia University).

---

## Architecture

```
User enters medications
  │
  ├─ Layer 1: Cached data (138 pre-collected drugs) ── instant
  ├─ Layer 2: RxNorm drug class lookup (any drug → class → pattern match) ── ~200ms
  ├─ Layer 3: OnSIDES database (2,562 ingredients, 28.1M pairs) ── instant (local SQLite)
  └─ Layer 4: Gemini 2.5 Flash (plain-language explanation + fallback detection) ── 2-5s
  │
  ▼
  Two output views:
  ├─ React Flow visualization (animated cascade chain — judges/pharmacists)
  └─ Simple plain-language view (elderly caregivers — big text, no jargon)
  │
  ▼
  Doctor Card PDF (one-page summary to bring to physician)
```

**Demo fallback mode:** Set `USE_FALLBACK=true` in `.env.local` to serve the pre-cached Margaret scenario with zero external API calls.

---

## Project Structure

```
cascadeguard/
├── public/
│   └── manifest.json              # PWA manifest (Add to Home Screen)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout + FDA disclaimer footer
│   │   ├── page.tsx               # Landing page (P5)
│   │   └── api/
│   │       └── analyze/
│   │           └── route.ts       # POST /api/analyze endpoint (P2)
│   ├── components/
│   │   ├── DrugInput.tsx          # Medication autocomplete input (P1)
│   │   ├── CascadeVisualization.tsx  # React Flow animated graph (P3)
│   │   ├── CascadeSimpleView.tsx  # Plain-language cascade view (P4)
│   │   ├── AIExplanation.tsx      # Gemini explanation card (P4)
│   │   └── DoctorCard.tsx         # PDF generation + download (P4)
│   ├── lib/
│   │   └── types.ts               # Shared TypeScript interfaces
│   └── styles/
│       └── globals.css            # Tailwind + React Flow + WCAG base
├── .env.local.example             # Environment variable template
├── .gitignore
├── package.json
├── tailwind.config.ts             # WCAG AA compliant color palette
├── tsconfig.json
└── next.config.js
```

---

## Team Assignments

### P1 — Drug Input + Autocomplete

**Owner:** _____________

**Files:** `src/components/DrugInput.tsx`

**What to build:**
- Text input field with fuzzy autocomplete dropdown
- Load `data/rxnorm-displaynames.json` (13,603 names) into fuse.js on mount
- Show top 5 fuzzy matches after 2 characters typed
- Each added medication appears as a removable chip/tag
- Keyboard navigable: arrow keys to select, Enter to add, Escape to close dropdown
- "Analyze My Medications" button — disabled until 2+ meds entered
- When button clicked, POST medication list to `/api/analyze`

**Key libraries:** `fuse.js` for fuzzy search

**Acceptance criteria:**
- [ ] Can type "lisinpril" (misspelled) and see "lisinopril" suggested
- [ ] Can add 6 medications as chips
- [ ] Can remove a medication by clicking X on its chip
- [ ] Autocomplete works with keyboard only (no mouse required)
- [ ] Minimum touch target 44px on all interactive elements
- [ ] Analyze button fires POST request with medication array

---

### P2 — Cascade Detection Engine

**Owner:** _____________

**Files:** `src/app/api/analyze/route.ts`, new files in `src/lib/`

**What to build:**
- `POST /api/analyze` endpoint that accepts `{ medications: string[] }`
- **Step 1: Normalize** — For each drug, look up in `data/rxnorm/{drug}.json` for RxCUI + drug class. If not cached, call RxNorm API live: `https://rxnav.nlm.nih.gov/REST/rxcui.json?name={drug}&search=2`
- **Step 2: Detect** — Load `data/pipc-patterns.json` (65 patterns). Compare every medication pair (O(n^2)) against patterns. Match on drug class, not just drug name — e.g., "lisinopril" matches "ACE Inhibitor" patterns
- **Step 3: Enrich** — For each detected cascade, look up FAERS count from `data/faers/{drugA}.json`. Find the matching MedDRA term count. NOTE: FAERS uses British spelling (OEDEMA not EDEMA)
- **Step 4: Chain** — Link cascades together where Drug B of cascade 1 = Drug A of cascade 2 (this creates the 3-drug-deep chains)
- **Step 5: Explain** — Call Gemini 2.5 Flash with structured cascade JSON to generate plain-language explanation. Fallback: use template string from `data/fallbacks/margaret.json` → `aiExplanationFallback`
- **Step 6: Return** — Return full `AnalysisResult` (see `src/lib/types.ts`)

**Key logic:** `detectCascades()` and `buildCascadeChains()` — write these in `src/lib/cascadeEngine.ts`

**Fallback mode:** If `USE_FALLBACK=true` env var is set, skip all logic and return `data/fallbacks/margaret.json` directly

**Acceptance criteria:**
- [ ] Margaret scenario (amlodipine, furosemide, allopurinol, lisinopril, benzonatate, metformin) returns exactly 3 cascades and 2 chains
- [ ] Chain 1 is 3 drugs deep (amlodipine → furosemide → allopurinol)
- [ ] Chain 2 is 2 drugs deep (lisinopril → benzonatate)
- [ ] FAERS counts match cached data (amlodipine OEDEMA PERIPHERAL = 8,359)
- [ ] Impact statement says "6 medications could become 3"
- [ ] Gemini explanation generates successfully
- [ ] Fallback mode works with USE_FALLBACK=true
- [ ] Response time < 5 seconds

---

### P3 — React Flow Visualization

**Owner:** _____________

**Files:** `src/components/CascadeVisualization.tsx`, custom node components in `src/components/nodes/`

**What to build:**
- React Flow canvas that renders cascade chains as an animated node graph
- **Custom node types:**
  - `DrugNodeTrigger` — green background (`cascade-trigger-bg`), pill icon, drug name + brand name
  - `DrugNodeCascade` — red background (`cascade-result-bg`), warning icon, drug name + brand name
  - `SideEffectNode` — orange background (`cascade-effect-bg`), alert icon, side effect name + FAERS count in bold
- **Animated edges:** flowing dots showing direction (Drug A → Side Effect → Drug B)
- **Sequential reveal:** nodes appear one at a time with 800ms delay using framer-motion. Edges animate after their source node appears
- **fitView:** auto-zoom to fit all nodes regardless of screen size
- **Don't rely on color alone** — each node type must have a different icon AND label (e.g., "Trigger Drug", "Side Effect", "Cascade Drug")
- **Dark text on light backgrounds** — all text must pass 4.5:1 contrast ratio
- **aria-label** on the canvas describing the cascade chain for screen readers

**Key libraries:** `@xyflow/react`, `framer-motion`, `lucide-react`

**IMPORTANT for Tailwind CSS 4 compatibility:** Import `@xyflow/react/dist/style.css` in `globals.css`, not in the component file

**Acceptance criteria:**
- [ ] Margaret scenario renders 2 cascade chains on one canvas
- [ ] Chain 1 shows: Amlodipine → Edema (8,359) → Furosemide → Gout → Allopurinol
- [ ] Chain 2 shows: Lisinopril → Cough (8,270) → Benzonatate
- [ ] Nodes appear sequentially with animation (not all at once)
- [ ] Edges animate with flowing dots
- [ ] fitView works — canvas fills the container
- [ ] Readable on a projector (test on external monitor!)
- [ ] Each node type is distinguishable without color (icon + label)

---

### P4 — AI Explanation + Simple View + Doctor Card

**Owner:** _____________

**Files:** `src/components/AIExplanation.tsx`, `src/components/CascadeSimpleView.tsx`, `src/components/DoctorCard.tsx`

**What to build:**

**AIExplanation.tsx:**
- Renders the Gemini-generated plain-language explanation in a styled card
- Shows loading state while generating ("Generating explanation...")
- Falls back to `aiExplanationFallback` from margaret.json if Gemini fails
- Text size: `text-lg` minimum (18px)

**CascadeSimpleView.tsx (NEW — elderly-friendly view):**
- A plain-language, step-by-step view of each cascade chain
- No technical jargon. Written like you're explaining to a grandparent
- Format per chain:
  ```
  Your doctor prescribed [Drug A] for [condition].
    ↓ It caused [side effect] ([X] FDA reports)
  Your doctor prescribed [Drug B] for the [side effect].
    💡 Switching [Drug A] could eliminate [Drug B].
  ```
- Large text (`text-xl`), high contrast, generous spacing
- This is the DEFAULT view. React Flow visualization is a toggle: "Show technical view"

**DoctorCard.tsx:**
- Client-side PDF generation with jsPDF
- One-page layout: patient name (optional input), date, medication list, detected cascades, alternatives, FAERS counts
- FDA disclaimer MUST be on the PDF: "This is a screening tool, not medical advice."
- Download button: "Download Doctor Card (PDF)"

**Key libraries:** `jspdf` for PDF, no library needed for simple view

**Acceptance criteria:**
- [ ] AI explanation renders with loading state
- [ ] Falls back gracefully if Gemini is unreachable
- [ ] Simple view is readable by a non-medical person
- [ ] Simple view is the default, React Flow is toggled
- [ ] Doctor Card PDF downloads with all cascade data
- [ ] PDF includes disclaimer
- [ ] All text is minimum 18px

---

### P5 — Landing Page + Polish + Pitch + Deploy

**Owner:** _____________

**Files:** `src/app/page.tsx`, general UI polish, Vercel deployment

**What to build:**

**Landing page:**
- Headline: "Are your medications treating side effects of each other?"
- Stat: "16% of older adults take medications prescribed to treat side effects of other medications."
- Embed DrugInput component
- Results page: CascadeSimpleView (default) + CascadeVisualization (toggle) + AIExplanation + DoctorCard
- Impact statement with animation: "6 medications could become 3"
- Data freshness note: "FDA adverse event data current as of March 2026"
- Loading state while analyzing: "Checking 65 cascade patterns..."
- Empty state (no cascades found): "Good news — no prescribing cascades detected. We checked 65 expert-validated patterns."
- Mobile responsive — stack vertically on small screens

**Deploy:**
- Deploy to Vercel (connect GitHub repo)
- Add `GEMINI_API_KEY` in Vercel dashboard → Settings → Environment Variables
- Test deployed version on phone + laptop

**PWA (Sunday polish):**
- App icons (192px + 512px) — can use a simple shield/pill icon
- manifest.json already exists in `public/`
- Service worker for offline data caching (stretch goal)

**Demo prep:**
- Practice demo 5x, time to 3 minutes
- Record backup demo video Saturday night
- Test on actual projector before presenting
- Prepare for judge Q&A (answers in PITCH.md below)

**Devpost submission:**
- Project description, screenshots, demo video, GitHub link, team members
- Start the draft Saturday night, not Sunday at deadline

**Acceptance criteria:**
- [ ] Landing page loads with clear headline and input
- [ ] Results render correctly after analysis
- [ ] Mobile responsive (test on phone)
- [ ] Deployed to Vercel and working
- [ ] Demo timed to 3 minutes
- [ ] Backup video recorded

---

## Git Workflow

```bash
# Create branches
git checkout -b dev
git push -u origin dev

# Each person creates their feature branch from dev
git checkout -b feat/drug-input      # P1
git checkout -b feat/cascade-engine  # P2
git checkout -b feat/visualization   # P3
git checkout -b feat/ai-explanation  # P4
git checkout -b feat/landing-polish  # P5

# When your feature works, merge to dev
git checkout dev
git pull origin dev
git merge feat/your-branch
git push origin dev

# Only merge dev → main when stable
```

---

## 48-Hour Build Schedule

### Friday Night (Hours 0-6): Scaffold + Connect

| Hour | P1 | P2 | P3 | P4 | P5 |
|------|----|----|----|----|-----|
| 0-1 | Set up fuse.js with displaynames | Set up /api/analyze endpoint | Install React Flow, test basic canvas | Get Gemini API key, test with sample prompt | Deploy scaffold to Vercel |
| 1-3 | Build autocomplete dropdown | Hardcode detectCascades() with 65 patterns | Build custom DrugNode and SideEffectNode | Write Gemini system prompt | Build landing page layout |
| 3-6 | Wire chips + keyboard nav | Wire FAERS data lookup | Build animated edge system | Build explanation card component | Connect frontend → backend, first end-to-end test |

**Hour 6 Milestone:** Type drugs → get cascade results → see something on screen. Ugly but functional.

### Saturday (Hours 6-24): Build + Integrate

| Hour | P1 | P2 | P3 | P4 | P5 |
|------|----|----|----|----|-----|
| 6-10 | Polish autocomplete UX | Add drug class matching via RxNorm | Style nodes with colors/icons | Build CascadeSimpleView | Build results page layout |
| 10-14 | Add RxCUI resolution | Implement buildCascadeChains() | Build sequential reveal animation | Build DoctorCard PDF | Cache layer + Margaret fallback |
| 14-18 | Edge cases: duplicates, empty | Add FAERS enrichment, validate MedDRA | Polish animation timing | Add impact statement | Loading/error/empty states |
| 18-24 | Integration testing | Integration testing | Integration testing | Integration testing | Full deploy + test |

**Hour 24 Milestone:** Margaret demo works end-to-end. All features functional.

### Sunday (Hours 24-36): Polish + Practice + Present

| Hour | All Hands |
|------|-----------|
| 24-28 | Bug fixes, UI polish, accessibility check |
| 28-32 | Record backup demo video. Practice pitch 5x. Prep Devpost submission. |
| 32-36 | Final demo on projector. Test fallback mode. Practice Q&A. Everyone knows key stats. |

**Hour 36 Milestone:** Demo rehearsed. Pitch timed to 3 minutes. Ready to present.

---

## What to Cut If Behind

Drop from bottom up:

| Priority | Feature | When to Cut |
|----------|---------|-------------|
| Cut first | PWA / Add to Home Screen | Behind 2+ hours at Hour 18 |
| Cut second | Doctor Card PDF | Behind 4+ hours at Hour 18 |
| Cut third | OnSIDES dynamic detection | Behind 3+ hours at Hour 14 |
| Cut fourth | React Flow visualization | Behind 6+ hours — use Simple View only |
| **Never cut** | Cascade detection engine | This IS the product |
| **Never cut** | Simple plain-language view | This IS the user experience |
| **Never cut** | Margaret demo fallback | This IS the safety net |

---

## Demo Script (3 Minutes)

| Time | Action | Audience Sees |
|------|--------|--------------|
| 0:00-0:30 | **Hook.** "Meet Margaret. She's 72, takes 6 medications, sees 3 specialists. None know about each other's prescriptions. 16% of older adults are in prescribing cascades — and nobody catches it." | Landing page |
| 0:30-0:50 | Type medications into autocomplete. Show fuzzy matching correcting a typo. | Chips appearing |
| 0:50-1:00 | Click "Analyze My Medications." | Loading: "Checking 65 cascade patterns..." |
| 1:00-1:45 | **Money shot.** Toggle to technical view. React Flow chain builds node by node. "That's a 3-drug cascade. One bad starting point created two unnecessary prescriptions." | Animated cascade chain |
| 1:45-2:10 | Toggle back to simple view. Read the plain-language explanation. "We built two views — technical for pharmacists, plain language for the 72-year-old caregiver." | Simple view |
| 2:10-2:30 | Show AI explanation. "The alternative? Switch amlodipine. The edema goes away. The diuretic goes away. The gout goes away." | AI explanation card |
| 2:30-2:50 | Click "Download Doctor Card." Show PDF. "Margaret prints this for her next appointment." | PDF preview |
| 2:50-3:00 | **Close.** "Every drug your grandparent takes was prescribed for a reason. CascadeGuard makes sure that reason isn't another drug." | Full cascade view |

---

## Pitch Stats (Memorize These)

| Stat | Source |
|------|--------|
| 16% of older adults in prescribing cascades | ThinkCascades (PMC9477172) |
| 43% of older adults take 5+ medications | National polypharmacy studies |
| 8,359 FDA reports of peripheral edema from amlodipine | openFDA FAERS (verified, cached) |
| 8,270 FDA reports of cough from lisinopril | openFDA FAERS (verified, cached) |
| 65 expert-validated patterns from 12 specialists across 8 countries | PIPC list (PMC12712104) |
| 28.1 million drug-adverse event pairs in our database | OnSIDES v3.1.0 |
| 2,562 drug ingredients covered | OnSIDES |
| 80% of older adults are open to stopping medications | 2025 deprescribing research |
| $9.11B medication management software market | Industry research |
| 125,000+ deaths/year from adverse drug events in US | FDA estimates |

---

## Judge Q&A Prep

**"Isn't this just a drug interaction checker?"**
> No. Interaction checkers flag when drugs interact chemically. CascadeGuard detects when Drug B was prescribed to treat a side effect of Drug A — a completely different problem. Interaction checkers miss cascades entirely.

**"How is this different from ThinkCascades?"**
> ThinkCascades is clinician-only, covers 9 patterns, has no visualization. We're patient-facing, cover 65 expert-validated patterns, enrich with real FDA report counts, and have both a technical visualization and an elderly-friendly plain-language view.

**"Is this a medical device?"**
> No. Under the January 2026 FDA CDS Guidance update, patient-facing educational screening tools are non-device software. We include clear disclaimers and direct users to their physician.

**"What if someone stops a medication because of your tool?"**
> CascadeGuard never recommends stopping any medication. The Doctor Card explicitly directs users to discuss with their physician. We recommend a conversation, not an action.

**"Who pays?"**
> Three channels: B2B SaaS to pharmacy chains ($50-200/location/month), B2B to insurers (per-member-per-month — each deprescribed cascade saves $1,000-3,000/year), and consumer freemium ($4.99/month premium).

**"Can this scale beyond 65 patterns?"**
> Yes. The systematic review identifies 115+ cascades. Our OnSIDES integration (28M drug-ADE pairs) already enables dynamic detection beyond the hardcoded patterns.

---

## Accessibility (WCAG AA)

Built into the scaffold:
- Color palette tested for 4.5:1+ contrast ratio against white
- Nodes use icons + labels, not just color
- Minimum 16px font size base
- 44px minimum touch targets
- Focus-visible outlines for keyboard navigation
- Semantic HTML (`<button>`, `<input>`, `<h1>`, not `<div>` for everything)
- aria-labels on key interactive elements
- FDA disclaimer visible on every page

**Pitch line:** "Our target user is a 65-year-old caregiver. Large text, high contrast, keyboard navigable. Accessibility isn't an afterthought — it's the product."

---

## License

Built for Hornet Hacks 4.0, March 20-22, 2026. Team Bitme @ Sacramento State.

Data sources: openFDA (public domain), RxNorm/NIH (public domain), OnSIDES (CC-BY 4.0).
