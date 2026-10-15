import fs from 'node:fs';
import path from 'node:path';
let html = fs.readFileSync('dist/index.html', 'utf8');
const scripts = [];
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) => { scripts.push('<script>' + fs.readFileSync(path.join('dist', src), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>'); return ''; });
html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_, href) => '<style>' + fs.readFileSync(path.join('dist', href), 'utf8') + '</style>');
html = html.replace('</body>', scripts.join('\n') + '</body>');
fs.writeFileSync('dist/打开作品.html', html);
console.log('Created dist/打开作品.html — offline entry with bundled JavaScript and CSS.');
