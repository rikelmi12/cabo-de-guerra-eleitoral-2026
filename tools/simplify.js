// Converte o GeoJSON pesado em um arquivo JS leve (window.BR_GEO) com coordenadas simplificadas.
const fs = require('fs');
const path = require('path');

const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'br.geojson'), 'utf8'));
const TOL = 0.03; // graus — tolerância de simplificação

function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max > eps) {
    const l = rdp(pts.slice(0, idx + 1), eps);
    const r = rdp(pts.slice(idx), eps);
    return l.slice(0, -1).concat(r);
  }
  return [pts[0], pts[pts.length - 1]];
}

const round = (n) => Math.round(n * 1000) / 1000;

const out = {};
for (const f of src.features) {
  const sigla = f.properties.sigla;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = [];
  for (const poly of polys) {
    const outer = poly[0];
    const simp = rdp(outer, TOL).map(([x, y]) => [round(x), round(y)]);
    if (simp.length >= 4) rings.push(simp);
  }
  out[sigla] = rings;
}

const js = '// Gerado por tools/simplify.js — contornos simplificados dos estados (lon, lat)\nwindow.BR_GEO = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'js', 'geo.js'), js);
console.log('geo.js bytes:', js.length);
