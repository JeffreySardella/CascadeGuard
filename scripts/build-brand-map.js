const fs = require('fs');
const path = require('path');

const RXNORM_DIR = path.join(__dirname, '..', 'src', 'data', 'rxnorm');
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'brand-to-generic.json');

const files = fs.readdirSync(RXNORM_DIR).filter(f => f.endsWith('.json'));
const map = {};
let duplicates = 0;

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(RXNORM_DIR, file), 'utf-8'));
  const generic = data.genericName.toLowerCase();

  for (const brand of data.brandNames || []) {
    const key = brand.toLowerCase();
    if (map[key] && map[key] !== generic) {
      console.warn(`Duplicate brand "${key}": already mapped to "${map[key]}", skipping "${generic}"`);
      duplicates++;
    } else {
      map[key] = generic;
    }
  }
}

// Sort keys alphabetically for stable output
const sorted = {};
for (const key of Object.keys(map).sort()) {
  sorted[key] = map[key];
}

fs.writeFileSync(OUT_FILE, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');

const brandCount = Object.keys(sorted).length;
console.log(`Mapped ${brandCount} brand names from ${files.length} rxnorm files.`);
if (duplicates > 0) {
  console.log(`${duplicates} duplicate brand name(s) encountered (kept first mapping).`);
}
console.log(`Written to ${OUT_FILE}`);
