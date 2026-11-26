const fs = require('node:fs');
const path = require('node:path');

const [directory, version] = process.argv.slice(2);
if (!directory || !/^[a-f0-9]{40}$/.test(version || '')) {
  throw Error('Version de publication invalide.');
}
const index = path.join(directory, 'index.html');
let html = fs.readFileSync(index, 'utf8');
if (!html.includes('<meta name="ew-build" content="development">')) {
  throw Error('Identifiant de version absent du site.');
}
html = html.replace('<meta name="ew-build" content="development">', `<meta name="ew-build" content="${version}">`);
// Every local script and stylesheet gets the same build ID, including future edits.
html = html.replace(/((?:src|href)="\.\/[^"?]+\.(?:js|css))(?:\?[^\"]*)?(\")/g, `$1?v=${version}$2`);
fs.writeFileSync(index, html);
for (const name of ['sw.js', 'offline.js']) {
  const file = path.join(directory, name);
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('__EW_BUILD__')) throw Error('Version de cache absente : ' + name);
  fs.writeFileSync(file, content.replaceAll('__EW_BUILD__', version));
}
fs.writeFileSync(path.join(directory, 'version.json'), JSON.stringify({ version }) + '\n');
