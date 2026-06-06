// Reads ESLint JSON from stdin, prints per-file error counts (desc).
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(0, 'utf8'));
const norm = (p) => {
  const u = p.replace(/\\/g, '/');
  const i = u.indexOf('/src/');
  return i >= 0 ? u.slice(i + 1) : u;
};
const rows = data
  .filter((f) => f.errorCount > 0)
  .map((f) => ({ file: norm(f.filePath), errors: f.errorCount }));
rows.sort((a, b) => b.errors - a.errors);
console.log('bestanden:', rows.length, '| errors:', rows.reduce((s, r) => s + r.errors, 0));
rows.forEach((r) => console.log(String(r.errors).padStart(4), r.file));
