// Baixa os resultados oficiais do TSE (1º e 2º turno 2026, Presidente) para cada UF e gera js/data.js
const fs = require('fs');
const path = require('path');

const UFS = ['ac','al','ap','am','ba','ce','df','es','go','ma','mt','ms','mg','pa','pb','pr','pe','pi','rj','rn','rs','ro','rr','sc','sp','se','to'];
const ELEICOES = { t1: '6257', t2: '6258' };
const url = (uf, e) => `https://resultados.tse.jus.br/oficial/ele2026/${e}/dados-simplificados/${uf}/${uf}-c0001-e00${e}-r.json`;

async function get(uf, e) {
  const r = await fetch(url(uf, e), { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`${uf} ${e}: HTTP ${r.status}`);
  return r.json();
}

const pct = (s) => parseFloat(String(s).replace(',', '.'));

function parse(json) {
  return {
    apurado: json.pst,
    validos: Number(json.vv),
    cands: json.cand.map((c) => ({ nome: c.nm, n: c.n, votos: Number(c.vap), pct: pct(c.pvap) })),
  };
}

(async () => {
  const out = {};
  for (const uf of ['br', ...UFS]) {
    out[uf] = {};
    for (const [k, e] of Object.entries(ELEICOES)) {
      out[uf][k] = parse(await get(uf, e));
    }
    const t1 = out[uf].t1.cands.slice().sort((a, b) => b.votos - a.votos).slice(0, 4).map((c) => `${c.nome} ${c.pct}`).join(' | ');
    console.log(uf.toUpperCase(), '| 1T:', t1, '| 2T:', out[uf].t2.cands.map((c) => `${c.nome} ${c.pct}`).join(' | '));
  }
  fs.writeFileSync(path.join(__dirname, 'tse_raw.json'), JSON.stringify(out, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
