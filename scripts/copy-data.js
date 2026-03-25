const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'data');
const DEST = path.join(__dirname, '..', 'public', 'data');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.name.endsWith('.json')) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean previous build artifacts
if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true });
}

// Copy specific files
const filesToCopy = [
  'pipc-patterns.json',
  'rxnorm-index.json',
  'rxnorm-displaynames.json',
  'brand-to-generic.json',
];

fs.mkdirSync(DEST, { recursive: true });

for (const file of filesToCopy) {
  fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
}

// Copy faers directory
copyDir(path.join(SRC, 'faers'), path.join(DEST, 'faers'));

console.log(`Copied data files to ${DEST}`);
