'use strict';
// Escribe sprites/lista.json con las imágenes que hay en la carpeta «sprites/» (el juego solo carga las
// de la lista). El servidor lo hace solo al arrancar; a mano: «node sprites-lista.js» o «npm run sprites».
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, 'sprites'), EXT = /\.(png|webp)$/i;
function listSprites() {
  const out = [];
  const walk = (d, rel) => {
    let ents = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(p, r); else if (EXT.test(e.name) && rel) out.push([r, Math.round(fs.statSync(p).mtimeMs / 1000)]);
    }
  };
  walk(DIR, '');
  out.sort((a, b) => a[0] < b[0] ? -1 : 1);
  return out;
}
function writeList() {
  if (!fs.existsSync(DIR)) return 0;
  const files = listSprites(), f = path.join(DIR, 'lista.json'), txt = JSON.stringify({ files }, null, 1) + '\n';
  try { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== txt) fs.writeFileSync(f, txt); } catch (e) { console.warn('No se pudo escribir sprites/lista.json:', e.message); }
  return files.length;
}
module.exports = { writeList };
if (require.main === module) console.log(`sprites/lista.json: ${writeList()} imágenes`);
