/**
 * Maps PIPC clinical class names to RxNorm/MeSH pharmacological class names.
 * Used by the cascade detection engine to bridge vocabularies.
 *
 * PIPC uses clinical shorthand (e.g., "Calcium Channel Blocker")
 * RxNorm uses MeSH pharmacological classes (e.g., "L-Calcium Channel Receptor Antagonists")
 */

// PIPC class → RxNorm MeSH class(es)
export const PIPC_TO_RXNORM: Record<string, string[]> = {
  // --- drugClassA entries (trigger drugs) ---
  'ACE Inhibitor': ['Angiotensin-converting Enzyme Inhibitors'],
  'Acitretin': [],
  'Alpha-1 Receptor Blocker': ['Adrenergic alpha1-Antagonists'],
  'Anticholinergic Antiemetic': ['Cholinergic Muscarinic Antagonists'],
  'Anticonvulsant': ['Sodium Channel Interactions', 'GABA A Receptor Interactions'],
  'Antidopaminergic Antiemetic': ['Dopamine Antagonists'],
  'Antihypertensive': [
    'Angiotensin-converting Enzyme Inhibitors',
    'L-Calcium Channel Receptor Antagonists',
    'Adrenergic beta1-Antagonists',
    'Sodium Chloride Symporter Inhibitors',
    'Adrenergic alpha1-Antagonists',
  ],
  'Antipsychotic': ['Dopamine Antagonists'],
  'Benzodiazepine': ['GABA A Modulators'],
  'Beta-blocker (lipophilic)': ['Adrenergic beta1-Antagonists'],
  'Bisphosphonate': ['Bone Surface Interactions'],
  'Calcium Channel Blocker': ['L-Calcium Channel Receptor Antagonists'],
  'Carbapenem': ['Transpeptidase Inhibitors'],
  'Cholinesterase Inhibitor': ['Cholinesterase Inhibitors'],
  'Corticosteroid': ['Glucocorticoid Receptor Agonists'],
  'DPP-4 Inhibitor': ['Dipeptidyl Peptidase 4 Inhibitors'],
  'Digoxin': ['Sodium-Potassium Exchanging ATPase Interactions'],
  'Diuretic': [
    'Sodium Chloride Symporter Inhibitors',
    'Sodium Potassium Chloride Symporter Inhibitors',
    'Aldosterone Antagonists',
  ],
  'Dopaminergic Antiparkinsonian Agent': ['Dopamine Receptor Interactions'],
  'Erythromycin': ['Protein Synthesis Inhibitors'],
  'Fludrocortisone': ['Mineralocorticoid Receptor Agonists'],
  'Flunarizine': ['Calcium Channel Antagonists'],
  'Gabapentinoid': ['GABA A Receptor Interactions'],
  'Iron Supplement': ['Electrolyte Activity'],
  'Laxative': ['Stool Bulking Activity', 'Surfactant Activity'],
  'Lithium': [],
  'Metformin': [],
  'Midodrine': ['Adrenergic alpha1-Agonists'],
  'NSAID': ['Cyclooxygenase Inhibitors', 'Cyclooxygenase 2 Inhibitors'],
  'Opioid': ['Full Opioid Agonists', 'Opioid mu-Receptor Agonists', 'Opioid Agonists'],
  'Proton Pump Inhibitor': ['Proton Pump Inhibitors'],
  'Rosiglitazone': [],
  'SGLT-2 Inhibitor': ['Sodium-Glucose Transporter 2 Inhibitors'],
  'SSRI/SNRI': ['Serotonin Uptake Inhibitors', 'Norepinephrine Uptake Inhibitors', 'Serotonin Transporter Interactions'],
  'Statin (HMG-CoA Reductase Inhibitor)': ['Hydroxymethylglutaryl-CoA Reductase Inhibitors'],
  'Thiazolidinedione': ['Insulin Receptor Agonists'],
  'Tricyclic Antidepressant': ['Norepinephrine Uptake Inhibitors'],
  'Urinary Anticholinergic': ['Cholinergic Muscarinic Antagonists'],
  'Venlafaxine': ['Serotonin Uptake Inhibitors', 'Norepinephrine Uptake Inhibitors'],

  // --- drugClassB entries (cascade result drugs) ---
  'Anti-gout Agent': ['Xanthine Oxidase Inhibitors'],
  'Anti-tremor Antimuscarinic': ['Cholinergic Muscarinic Antagonists'],
  'Antiarrhythmic': [],
  'Antidepressant': ['Serotonin Uptake Inhibitors', 'Norepinephrine Uptake Inhibitors'],
  'Antidiarrheal': [],
  'Antidiarrheal Agent': [],
  'Antiemetic': ['Dopamine Antagonists', 'Serotonin 5HT-3 Antagonists'],
  'Antifungal': ['14-alpha Demethylase Inhibitors', 'Ergosterol Synthesis Inhibitors'],
  'Antihistamine': ['Histamine H1 Receptor Antagonists'],
  'Antihyperglycemic': [],
  'Antiparkinsonian Agent': ['Dopamine Receptor Interactions'],
  'Beta-blocker': ['Adrenergic beta1-Antagonists'],
  'Bismuth Subsalicylate': [],
  'Cough Remedy': [],
  'Gastroprotective Agent': ['Proton Pump Inhibitors'],
  'Heart Failure Agent': [],
  'Mineral Supplement': ['Electrolyte Activity'],
  'Overactive Bladder Medication': ['Cholinergic Muscarinic Antagonists', 'Adrenergic beta3-Agonists'],
  'PDE-5 Inhibitor': ['Phosphodiesterase 5 Inhibitors'],
  'Pain Reliever': ['Cyclooxygenase Inhibitors'],
  'Quinine Sulfate': [],
  'Saliva Substitute': [],
  'Sedative': ['GABA A Modulators'],
  'Sleep Agent': ['GABA A Modulators', 'Orexin Receptor Antagonists'],
  'Topical Corticosteroid': ['Glucocorticoid Receptor Agonists'],
  'Vestibular Suppressant': ['Histamine H1 Receptor Antagonists'],
  'Vitamin/Calcium Supplement': [],
  'Vitamin/Mineral Supplement': [],
};

/**
 * Check if a drug's RxNorm class matches a PIPC pattern class.
 */
export function rxnormClassMatchesPipc(
  rxnormClass: string,
  pipcClass: string
): boolean {
  const mappedRxnormClasses = PIPC_TO_RXNORM[pipcClass];
  if (!mappedRxnormClasses || mappedRxnormClasses.length === 0) {
    return false;
  }
  return mappedRxnormClasses.includes(rxnormClass);
}
