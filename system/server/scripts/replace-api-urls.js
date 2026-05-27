const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', '..', 'main', 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?)$/.test(entry.name) && !full.endsWith(`${path.sep}config${path.sep}api.ts`)) files.push(full);
  }
  return files;
}

function ensureImport(content) {
  if (content.includes("from '@/config/api'") || content.includes('from "@/config/api"')) return content;
  const importLine = "import { apiUrl } from '@/config/api';\n";
  const utilsMatch = content.match(/^import[^\n]+from ['"]@\/lib\/utils['"];?\n/m);
  if (utilsMatch) {
    return content.replace(utilsMatch[0], utilsMatch[0] + importLine);
  }
  const firstImport = content.match(/^import[^\n]+\n/m);
  if (firstImport) {
    return content.replace(firstImport[0], firstImport[0] + importLine);
  }
  return importLine + content;
}

function transform(content) {
  if (!content.includes('localhost:5000')) return null;
  let out = content;
  out = out.replace(/`http:\/\/localhost:5000(\$\{[^}]+\})`/g, 'apiUrl(`$1`)');
  out = out.replace(/`http:\/\/localhost:5000([^`]*)`/g, (_, rest) => {
    if (rest.includes('${')) return `apiUrl(\`${rest}\`)`;
    return `apiUrl('${rest}')`;
  });
  out = out.replace(/'http:\/\/localhost:5000([^']*)'/g, (_, rest) => `apiUrl('${rest}')`);
  out = out.replace(/"http:\/\/localhost:5000([^"]*)"/g, (_, rest) => `apiUrl("${rest}")`);
  out = ensureImport(out);
  return out;
}

let count = 0;
for (const file of walk(srcDir)) {
  const content = fs.readFileSync(file, 'utf8');
  const next = transform(content);
  if (next && next !== content) {
    fs.writeFileSync(file, next);
    count++;
    console.log('Updated:', path.relative(srcDir, file));
  }
}
console.log(`Done. Updated ${count} files.`);
