/* Cabo de Guerra Eleitoral 2026 — lógica do jogo (1º, 2º Turno e Variação/Gráficos) */
(() => {
  'use strict';

  const GEO = window.BR_GEO;
  const DATA = window.BR_DATA;
  const UFS = Object.keys(DATA.estados);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const fmt = (n, d = 2) => Number(n).toFixed(d).replace('.', ',');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const NAMES = { lula: 'Lula', flavio: 'Flávio Bolsonaro' };
  const GAME_TIME = 90;
  const CLICK_COST = 7;
  const PLAYER_REGEN = 14;
  const NEUTRAL = 50;

  const DIFF = {
    facil:   { regen: 9,  interval: 0.55, smart: 0.45, special: 0.10 },
    normal:  { regen: 13, interval: 0.40, smart: 0.75, special: 0.18 },
    dificil: { regen: 17, interval: 0.30, smart: 0.95, special: 0.28 },
  };

  const SPECIALS = {
    comicio:  { cost: 30, cd: 6,  label: 'Comício' },
    caravana: { cost: 50, cd: 12, label: 'Caravana' },
    debate:   { cost: 80, cd: 20, label: 'Debate na TV' },
  };

  // Cálculo de dados de variação para cada estado
  const SWINGS = {};
  for (const uf of UFS) {
    const st = DATA.estados[uf];
    const diffL = st.t2.lula - st.t1.lula;
    const diffF = st.t2.flavio - st.t1.flavio;
    const net = diffL - diffF;
    const flipped = st.t1.vencedor !== st.t2.vencedor;
    SWINGS[uf] = {
      uf,
      nome: st.nome,
      regiao: st.regiao,
      eleitores: st.eleitores,
      diffL,
      diffF,
      net,
      flipped,
      vencedorT1: st.t1.vencedor,
      vencedorT2: st.t2.vencedor,
    };
  }

  // Retorna os valores normalizados de Lula para o mapa
  function getTurnRealValues(turn) {
    const vals = {};
    for (const uf of UFS) {
      const d = DATA.estados[uf];
      if (turn === 't2') {
        vals[uf] = d.t2.lula;
      } else if (turn === 't1') {
        const sum = d.t1.lula + d.t1.flavio;
        vals[uf] = (d.t1.lula / sum) * 100;
      } else if (turn === 'diff') {
        // Modo variação: mapeia o netSwing em uma escala centralizada em 50
        // net varia tipicamente entre -4 e +8 p.p.
        const net = SWINGS[uf].net;
        vals[uf] = clamp(50 + net * 4.5, 10, 90);
      }
    }
    return vals;
  }

  const ownerOf = (v) => (v > 50 ? 'lula' : v < 50 ? 'flavio' : 'none');

  const S = {
    turn: 't2', // 't1', 't2' ou 'diff'
    mode: 'explore', // 'explore', 'countdown', 'playing', 'ended'
    paused: false,
    side: null,
    ai: null,
    diff: 'normal',
    values: {},
    owners: {},
    selected: null,
    energy: 100,
    aiEnergy: 100,
    timeLeft: GAME_TIME,
    countdownText: '3',
    combo: 0,
    lastClick: 0,
    cd: { comicio: 0, caravana: 0, debate: 0 },
    aiCd: { comicio: 0, caravana: 0, debate: 0 },
    aiTarget: null,
    aiRetarget: 0,
    aiClick: 0,
    nextEvent: 10,
    sound: true,
    dirty: new Set(UFS),
    // Filtros do painel de gráficos
    chartFilter: 'todos',
    chartSort: 'swingLula',
  };

  function setTurn(turn) {
    S.turn = turn;
    $('btn-t1').classList.toggle('active', turn === 't1');
    $('btn-t2').classList.toggle('active', turn === 't2');
    $('btn-diff').classList.toggle('active', turn === 'diff');

    if ($('round-t1')) $('round-t1').classList.toggle('chip--on', turn === 't1');
    if ($('round-t2')) $('round-t2').classList.toggle('chip--on', turn === 't2');

    // Atualiza legenda do mapa
    const lgLula = document.querySelector('.lg--lula');
    const lgFlavio = document.querySelector('.lg--flavio');
    const lgScale = document.querySelector('.lg-scale');

    if (turn === 'diff') {
      lgLula.textContent = 'Lula cresceu mais';
      lgFlavio.textContent = 'Flávio cresceu mais';
      lgScale.classList.add('lg-scale--diff');
    } else {
      lgLula.textContent = 'Lula forte';
      lgFlavio.textContent = 'Flávio forte';
      lgScale.classList.remove('lg-scale--diff');
    }

    if (S.mode === 'explore') {
      const real = getTurnRealValues(turn);
      S.values = { ...real };
      UFS.forEach((uf) => {
        if (turn === 'diff') {
          S.owners[uf] = SWINGS[uf].net > 0 ? 'lula' : SWINGS[uf].net < 0 ? 'flavio' : 'none';
        } else {
          S.owners[uf] = DATA.estados[uf][turn].vencedor;
        }
        S.dirty.add(uf);
      });

      let tInfo = '';
      if (turn === 't1') {
        tInfo = 'Resultado oficial do 1º turno · 04/10/2026 (Flávio 47,03% · Lula 45,16% · Outros 7,81%)';
      } else if (turn === 't2') {
        tInfo = 'Resultado oficial do 2º turno · 25/10/2026 (Lula reeleito com 51,79% · Flávio 48,21%)';
      } else {
        tInfo = 'Variação 1º ➔ 2º Turno: Migração de Votos (Lula +6,63 p.p. médios | Flávio +1,18 p.p.)';
      }
      $('mode-label').textContent = tInfo;
      if (hovered && typeof showStateCard === 'function' && $('state-card') && !$('state-card').classList.contains('hidden')) {
        showStateCard(hovered);
      }
    }
  }

  // Inicializa valores com 2º turno por padrão
  S.values = { ...getTurnRealValues('t2') };
  UFS.forEach((uf) => (S.owners[uf] = DATA.estados[uf].t2.vencedor));

  /* ---------------- Projeção e SVG ---------------- */
  const merc = ([lon, lat]) => [lon * Math.PI / 180, -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const uf of UFS) for (const ring of GEO[uf]) for (const p of ring) {
    const [x, y] = merc(p);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const BOX = { x0: 20, y0: 20, x1: 860, y1: 980 };
  const scale = Math.min((BOX.x1 - BOX.x0) / (maxX - minX), (BOX.y1 - BOX.y0) / (maxY - minY));
  const offX = BOX.x0 + ((BOX.x1 - BOX.x0) - (maxX - minX) * scale) / 2;
  const offY = BOX.y0 + ((BOX.y1 - BOX.y0) - (maxY - minY) * scale) / 2;
  const proj = (p) => { const [x, y] = merc(p); return [offX + (x - minX) * scale, offY + (y - minY) * scale]; };

  function centroid(ring) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x0, y0] = ring[j], [x1, y1] = ring[i];
      const f = x0 * y1 - x1 * y0;
      a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
    }
    a *= 0.5;
    return { x: cx / (6 * a), y: cy / (6 * a), area: Math.abs(a) };
  }

  const svg = $('map');
  const gStates = document.createElementNS(SVGNS, 'g');
  const gLabels = document.createElementNS(SVGNS, 'g');
  const gFx = document.createElementNS(SVGNS, 'g');
  svg.append(gStates, gLabels, gFx);

  const paths = {}, labels = {}, centers = {};
  for (const uf of UFS) {
    let d = '', best = null;
    for (const ring of GEO[uf]) {
      const pts = ring.map(proj);
      d += 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
      const c = centroid(pts);
      if (!best || c.area > best.area) best = c;
    }
    centers[uf] = best;
    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'state');
    path.dataset.uf = uf;
    gStates.appendChild(path);
    paths[uf] = path;
  }

  const coastX = Math.max(...['RN', 'PB', 'PE', 'AL', 'SE'].map((uf) => centers[uf].x)) + 70;
  const LABEL_POS = {
    RN: { x: coastX, y: centers.RN.y - 22 },
    PB: { x: coastX, y: centers.PB.y + 2 },
    PE: { x: coastX, y: centers.PE.y + 28 },
    AL: { x: coastX, y: centers.AL.y + 50 },
    SE: { x: coastX, y: centers.SE.y + 74 },
    ES: { x: centers.ES.x + 62, y: centers.ES.y + 6 },
    RJ: { x: centers.RJ.x + 70, y: centers.RJ.y + 40 },
    DF: { x: centers.DF.x + 58, y: centers.DF.y - 34 },
    GO: { x: centers.GO.x - 20, y: centers.GO.y + 22 },
  };
  const LEADERS = ['RN', 'PB', 'PE', 'AL', 'SE', 'ES', 'RJ', 'DF'];
  for (const uf of UFS) {
    const c = centers[uf];
    const pos = LABEL_POS[uf] || { x: c.x, y: c.y };
    if (LEADERS.includes(uf)) {
      const line = document.createElementNS(SVGNS, 'path');
      line.setAttribute('class', 'leader');
      line.setAttribute('d', `M${c.x},${c.y}L${pos.x - 20},${pos.y}`);
      gLabels.appendChild(line);
    }
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('class', 'label');
    t.setAttribute('x', pos.x); t.setAttribute('y', pos.y - 6);
    t.dataset.uf = uf;
    t.textContent = uf;
    const p = document.createElementNS(SVGNS, 'text');
    p.setAttribute('class', 'label label--pct');
    p.setAttribute('x', pos.x); p.setAttribute('y', pos.y + 9);
    p.dataset.uf = uf;
    gLabels.append(t, p);
    labels[uf] = p;
    centers[uf].lx = pos.x; centers[uf].ly = pos.y;
  }

  function colorFor(lula) {
    if (lula === NEUTRAL) return '#3a4062';
    const m = lula - 50;
    const t = clamp(Math.abs(m) / 30, 0, 1);
    const hue = m >= 0 ? 355 : 145;
    const sat = 55 + 30 * t;
    const light = 70 - 34 * t;
    return `hsl(${hue} ${sat}% ${light}%)`;
  }

  /* ---------------- Áudio WebAudio ---------------- */
  let actx = null;
  function beep(freq, dur = 0.08, type = 'sine', vol = 0.06, delay = 0) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      const t0 = actx.currentTime + delay;
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(actx.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (_) {}
  }

  /* ---------------- Mecânica ---------------- */
  const clickPower = (uf) => clamp(2.4 / Math.pow(DATA.estados[uf].eleitores, 0.35), 0.6, 3.2);

  function push(uf, side, amount) {
    const v = S.values[uf] + (side === 'lula' ? amount : -amount);
    S.values[uf] = clamp(v, 5, 95);
    S.dirty.add(uf);
    const owner = ownerOf(S.values[uf]);
    if (owner !== S.owners[uf]) {
      const prev = S.owners[uf];
      S.owners[uf] = owner;
      flipFx(uf, owner, prev);
    }
  }

  const TOTAL_W = UFS.reduce((s, uf) => s + DATA.estados[uf].eleitores, 0);

  function national() {
    if (S.mode === 'explore') {
      if (S.turn === 'diff') return 51.79;
      const nat = DATA.nacional[S.turn];
      return nat.lula;
    }
    const l = UFS.reduce((s, uf) => s + S.values[uf] * DATA.estados[uf].eleitores, 0) / TOTAL_W;
    return clamp(l, 0, 100);
  }

  function flipFx(uf, owner, prev) {
    if (owner === 'none') return;
    const p = paths[uf];
    p.classList.remove('flip'); void p.getBBox(); p.classList.add('flip');
    ring(centers[uf].x, centers[uf].y, owner === 'lula' ? 'var(--lula)' : 'var(--flavio)');
    if (S.mode === 'playing') {
      const mine = owner === S.side;
      log(prev === 'none'
        ? `🚩 ${NAMES[owner]} conquistou <b>${DATA.estados[uf].nome}</b>!`
        : `🔄 <b>${DATA.estados[uf].nome}</b> virou para ${NAMES[owner]}!`, owner);
      if (navigator.vibrate) {
        try { navigator.vibrate(mine ? [25, 35, 25] : 35); } catch (_) {}
      }
      beep(mine ? 660 : 300, 0.12, 'triangle', 0.07);
      beep(mine ? 880 : 220, 0.18, 'triangle', 0.07, 0.1);
    }
  }

  function ring(x, y, color) {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 34);
    c.setAttribute('class', 'ring'); c.style.stroke = color;
    gFx.appendChild(c);
    setTimeout(() => c.remove(), 650);
  }

  function floatText(x, y, txt, color) {
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('class', 'float-txt'); t.style.fill = color;
    t.textContent = txt;
    gFx.appendChild(t);
    setTimeout(() => t.remove(), 900);
  }

  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function select(uf) {
    if (S.selected && paths[S.selected]) paths[S.selected].classList.remove('selected');
    S.selected = uf;
    const bComicio = $('act-comicio');
    if (uf) {
      paths[uf].classList.add('selected');
      gStates.appendChild(paths[uf]);
      $('selected-label').textContent = '· ' + DATA.estados[uf].nome;
      if (bComicio) bComicio.querySelector('.action__txt b').textContent = `Comício (${uf})`;
    } else {
      $('selected-label').textContent = '· selecione um estado';
      if (bComicio) bComicio.querySelector('.action__txt b').textContent = 'Comício';
    }
  }

  function playerClick(uf, evt) {
    select(uf);
    if (S.mode !== 'playing' || S.paused) return;
    if (S.energy < CLICK_COST) { floatText(svgPoint(evt).x, svgPoint(evt).y, 'sem energia', '#fbbf24'); return; }
    const now = performance.now();
    S.combo = now - S.lastClick < 650 ? Math.min(S.combo + 1, 10) : 0;
    S.lastClick = now;
    const mult = 1 + S.combo * 0.05;
    const amt = clickPower(uf) * mult;
    S.energy -= CLICK_COST;
    push(uf, S.side, amt);
    const p = svgPoint(evt);
    floatText(p.x, p.y, '+' + fmt(amt, 1), S.side === 'lula' ? '#ff6b7c' : '#4ade80');
    const path = paths[uf];
    path.classList.remove('hit'); void path.getBBox(); path.classList.add('hit');
    beep(440 + S.combo * 45, 0.06, 'square', 0.035);
    const comboEl = $('combo');
    comboEl.textContent = S.combo >= 2 ? `COMBO x${fmt(mult, 2)}` : '';
    comboEl.classList.remove('bump'); void comboEl.offsetWidth; comboEl.classList.add('bump');
  }

  function useSpecial(kind, who) {
    const isAI = who !== S.side;
    const energyKey = isAI ? 'aiEnergy' : 'energy';
    const cds = isAI ? S.aiCd : S.cd;
    const sp = SPECIALS[kind];
    if (S.mode !== 'playing' || S.paused) return false;
    if (S[energyKey] < sp.cost || cds[kind] > 0) return false;
    const target = isAI ? S.aiTarget : S.selected;
    if ((kind === 'comicio' || kind === 'caravana') && !target) {
      if (!isAI) log('Selecione um estado no mapa primeiro.', 'gold');
      return false;
    }
    S[energyKey] -= sp.cost;
    cds[kind] = sp.cd;
    const color = who === 'lula' ? 'var(--lula)' : 'var(--flavio)';
    if (kind === 'comicio') {
      const amt = clickPower(target) * 5;
      push(target, who, amt);
      ring(centers[target].x, centers[target].y, color);
      floatText(centers[target].x, centers[target].y - 10, '📣 +' + fmt(amt, 1), who === 'lula' ? '#ff6b7c' : '#4ade80');
      log(`📣 ${NAMES[who]} faz comício em <b>${DATA.estados[target].nome}</b>.`, who);
    } else if (kind === 'caravana') {
      const reg = DATA.estados[target].regiao;
      UFS.filter((uf) => DATA.estados[uf].regiao === reg).forEach((uf) => {
        const amt = clickPower(uf) * 2.5;
        push(uf, who, amt);
        ring(centers[uf].x, centers[uf].y, color);
      });
      log(`🚌 Caravana de ${NAMES[who]} percorre o <b>${reg}</b>.`, who);
    } else {
      UFS.forEach((uf) => push(uf, who, 1.5));
      log(`📺 ${NAMES[who]} se destaca no <b>debate na TV</b>!`, who);
    }
    beep(who === S.side ? 520 : 260, 0.25, 'sawtooth', 0.04);
    return true;
  }

  /* ---------------- IA ---------------- */
  function aiChooseTarget() {
    const cfg = DIFF[S.diff];
    let best = null, bestScore = -Infinity;
    for (const uf of UFS) {
      const share = S.ai === 'lula' ? S.values[uf] : 100 - S.values[uf];
      const m = share - 50;
      const w = Math.pow(DATA.estados[uf].eleitores, 0.75);
      const closeness = Math.exp(-Math.abs(m + 1.5) / 9);
      const score = cfg.smart * w * closeness + (1 - cfg.smart) * rand(0, 6) + rand(0, 0.3);
      if (score > bestScore) { bestScore = score; best = uf; }
    }
    S.aiTarget = best;
    S.aiRetarget = rand(1.8, 3.2);
  }

  function aiTick(dt) {
    const cfg = DIFF[S.diff];
    S.aiEnergy = Math.min(100, S.aiEnergy + cfg.regen * dt);
    for (const k in S.aiCd) S.aiCd[k] = Math.max(0, S.aiCd[k] - dt);
    S.aiRetarget -= dt;
    if (!S.aiTarget || S.aiRetarget <= 0) aiChooseTarget();

    if (Math.random() < cfg.special * dt) {
      const opts = ['debate', 'caravana', 'comicio'].filter((k) => S.aiCd[k] <= 0 && S.aiEnergy >= SPECIALS[k].cost + 10);
      if (opts.length) { useSpecial(opts[0], S.ai); return; }
    }

    S.aiClick -= dt;
    if (S.aiClick <= 0 && S.aiEnergy >= CLICK_COST) {
      S.aiClick = cfg.interval * rand(0.8, 1.2);
      S.aiEnergy -= CLICK_COST;
      const uf = S.aiTarget;
      const amt = clickPower(uf);
      push(uf, S.ai, amt);
      const c = centers[uf];
      if (Math.random() < 0.5) floatText(c.x + rand(-18, 18), c.y + rand(-10, 10), '+' + fmt(amt, 1), S.ai === 'lula' ? '#ff6b7c' : '#4ade80');
    }
  }

  /* ---------------- Eventos aleatórios ---------------- */
  const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
  const EV_REGION = [
    'Debate entre governadores repercute no {R}',
    'Onda de calor mobiliza eleitores no {R}',
    'Caravana de artistas e lideranças agita o {R}',
    'Nova pesquisa estadual esquenta a disputa no {R}',
    'Jingle de campanha vira febre no {R}',
  ];
  const EV_STATE = [
    '{E}: vídeo viral domina as redes locais',
    '{E}: prefeitos da região anunciam apoio de peso',
    '{E}: grande comício de rua reúne multidão',
    '{E}: entrevista em rádio local ganha destaque',
    '{E}: mobilização jovem cresce nos colégios eleitorais',
  ];
  function randomEvent() {
    const side = Math.random() < 0.5 ? 'lula' : 'flavio';
    if (Math.random() < 0.45) {
      const R = pick(REGIONS);
      const amt = rand(1.2, 2.6);
      UFS.filter((uf) => DATA.estados[uf].regiao === R).forEach((uf) => push(uf, side, amt));
      log(`📰 ${pick(EV_REGION).replace('{R}', R)} — vantagem para <b>${NAMES[side]}</b> (+${fmt(amt, 1)}).`, side);
    } else {
      const uf = pick(UFS);
      const amt = rand(2, 4.5);
      push(uf, side, amt);
      ring(centers[uf].x, centers[uf].y, '#fbbf24');
      log(`📰 ${pick(EV_STATE).replace('{E}', DATA.estados[uf].nome)} — vantagem para <b>${NAMES[side]}</b> (+${fmt(amt, 1)}).`, side);
    }
    beep(990, 0.08, 'sine', 0.05); beep(1320, 0.1, 'sine', 0.05, 0.09);
  }

  /* ---------------- UI & HUD ---------------- */
  function log(html, kind) {
    const li = document.createElement('li');
    li.className = 'feed__item' + (kind ? ' feed__item--' + kind : '');
    li.innerHTML = html;
    const feed = $('feed');
    feed.prepend(li);
    while (feed.children.length > 30) feed.lastChild.remove();
  }

  function renderMap() {
    for (const uf of S.dirty) {
      const v = S.values[uf];
      paths[uf].style.fill = colorFor(v);
      let txt = '—';
      if (S.mode === 'explore') {
        if (S.turn === 'diff') {
          const sw = SWINGS[uf];
          const sign = sw.diffL >= 0 ? '+' : '';
          txt = `${sign}${fmt(sw.diffL, 1)}%`;
        } else {
          const dState = DATA.estados[uf][S.turn];
          const leadPct = dState.vencedor === 'lula' ? dState.lula : dState.flavio;
          txt = fmt(leadPct, 1) + '%';
        }
      } else if (v !== NEUTRAL) {
        const lead = v >= 50 ? v : 100 - v;
        txt = fmt(lead, 1) + '%';
      }
      labels[uf].textContent = txt;
    }
    S.dirty.clear();
  }

  function renderHUD() {
    if (S.mode === 'explore') {
      if (S.turn === 'diff') {
        $('pct-lula').textContent = '+6,63 p.p.';
        $('pct-flavio').textContent = '+1,18 p.p.';
        $('states-lula').innerHTML = 'Ganho <b>Nacional</b>';
        $('states-flavio').innerHTML = 'Ganho <b>Nacional</b>';

        // 84.9% vs 15.1% na absorção da 3ª via
        $('tug-lula').style.width = '84.9%';
        $('tug-flavio').style.width = '15.1%';
        $('tug-knot').style.left = '84.9%';
        $('card-lula').classList.add('is-leading');
        $('card-flavio').classList.remove('is-leading');
      } else {
        const nat = DATA.nacional[S.turn];
        $('pct-lula').textContent = fmt(nat.lula) + '%';
        $('pct-flavio').textContent = fmt(nat.flavio) + '%';
        $('states-lula').innerHTML = `<b id="states-lula-count">${nat.estadosLula}</b> estados`;
        $('states-flavio').innerHTML = `<b id="states-flavio-count">${nat.estadosFlavio}</b> estados`;

        const sumLF = nat.lula + nat.flavio;
        const lulaShare = (nat.lula / sumLF) * 100;
        const vis = clamp(50 + (lulaShare - 50) * 4, 5, 95);
        $('tug-lula').style.width = vis + '%';
        $('tug-flavio').style.width = (100 - vis) + '%';
        $('tug-knot').style.left = vis + '%';
        $('card-lula').classList.toggle('is-leading', nat.lula > nat.flavio);
        $('card-flavio').classList.toggle('is-leading', nat.flavio > nat.lula);
      }
    } else {
      const l = national(), f = 100 - l;
      $('pct-lula').textContent = fmt(l) + '%';
      $('pct-flavio').textContent = fmt(f) + '%';
      const nL = UFS.filter((uf) => S.owners[uf] === 'lula').length;
      const nF = UFS.filter((uf) => S.owners[uf] === 'flavio').length;
      $('states-lula').innerHTML = `<b>${nL}</b> estados`;
      $('states-flavio').innerHTML = `<b>${nF}</b> estados`;

      const vis = clamp(50 + (l - 50) * 4, 2, 98);
      $('tug-lula').style.width = vis + '%';
      $('tug-flavio').style.width = (100 - vis) + '%';
      $('tug-knot').style.left = vis + '%';
      $('card-lula').classList.toggle('is-leading', l > 50);
      $('card-flavio').classList.toggle('is-leading', l < 50);
    }

    $('energy-fill').style.width = S.energy + '%';
    $('energy-text').textContent = Math.floor(S.energy);

    for (const k of Object.keys(SPECIALS)) {
      const btn = $('act-' + k);
      const needSel = k !== 'debate' && !S.selected;
      btn.disabled = S.mode !== 'playing' || S.energy < SPECIALS[k].cost || S.cd[k] > 0 || needSel;
      btn.querySelector('.action__cd').style.width = (S.cd[k] > 0 ? (S.cd[k] / SPECIALS[k].cd) * 100 : 0) + '%';
    }

    const timer = $('timer');
    if (S.mode === 'playing') {
      const t = Math.ceil(S.timeLeft);
      timer.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
      timer.classList.toggle('urgent', t <= 10);
    } else if (S.mode === 'countdown') {
      timer.textContent = S.countdownText;
      timer.classList.add('urgent');
    } else {
      timer.textContent = S.mode === 'ended' ? 'Fim' : (S.turn === 't1' ? '1ºT' : S.turn === 't2' ? '2ºT' : 'Var.');
      timer.classList.remove('urgent');
    }
  }

  /* ---------------- Tooltip ---------------- */
  const tip = $('tooltip');
  let hovered = null;
  function renderTip() {
    if (!hovered) return;
    const e = DATA.estados[hovered];
    const sw = SWINGS[hovered];

    if (S.mode === 'explore') {
      if (S.turn === 'diff') {
        const signL = sw.diffL >= 0 ? '+' : '';
        const signF = sw.diffF >= 0 ? '+' : '';
        const flipBadge = sw.flipped
          ? `<div class="tt__real" style="color:var(--gold);font-weight:700">⭐ MUDOU DE LADO: Flávio no 1ºT ➔ Lula no 2ºT!</div>`
          : '';

        tip.innerHTML = `
          <div class="tt__title">${e.nome} (${hovered})</div>
          <div class="tt__sub">${e.regiao} · Variação 1ºT ➔ 2ºT</div>
          <div class="tt__row tt__row--lula">
            <span>Lula: ${fmt(e.t1.lula)}% ➔ ${fmt(e.t2.lula)}%</span>
            <b>${signL}${fmt(sw.diffL)} p.p.</b>
          </div>
          <div class="tt__row tt__row--flavio">
            <span>Flávio: ${fmt(e.t1.flavio)}% ➔ ${fmt(e.t2.flavio)}%</span>
            <b>${signF}${fmt(sw.diffF)} p.p.</b>
          </div>
          <div class="tt__real">Saldo líquido pró-${sw.net >= 0 ? 'Lula' : 'Flávio'}: <b>${fmt(Math.abs(sw.net))} p.p.</b></div>
          ${flipBadge}`;
      } else {
        const dTurn = e[S.turn];
        const vencedor = dTurn.vencedor === 'lula' ? 'Lula' : 'Flávio';
        const turnoLabel = S.turn === 't1' ? '1º Turno (04/10/2026)' : '2º Turno (25/10/2026)';
        const outrosHtml = dTurn.outros > 0
          ? `<div class="tt__row muted"><span>Outros candidatos</span><span>${fmt(dTurn.outros)}%</span></div>`
          : '';
        const mgNote = hovered === 'MG'
          ? (S.turn === 't1' ? '<div class="tt__real" style="color:var(--flavio)">⭐ MG votou em Flávio no 1º turno!</div>'
                             : '<div class="tt__real" style="color:var(--lula)">⭐ Fiel da Balança: MG virou para Lula no 2º turno!</div>')
          : '';

        tip.innerHTML = `
          <div class="tt__title">${e.nome} (${hovered})</div>
          <div class="tt__sub">${e.regiao} · ~${fmt(e.eleitores, 1)} mi de eleitores</div>
          <div class="tt__row tt__row--lula"><span>Lula</span><span>${fmt(dTurn.lula)}%</span></div>
          <div class="tt__bar">
            <i style="width:${dTurn.lula}%;background:var(--lula)"></i>
            ${dTurn.outros > 0 ? `<i style="width:${dTurn.outros}%;background:#8b5cf6"></i>` : ''}
            <i style="width:${dTurn.flavio}%;background:var(--flavio)"></i>
          </div>
          <div class="tt__row tt__row--flavio"><span>Flávio Bolsonaro</span><span>${fmt(dTurn.flavio)}%</span></div>
          ${outrosHtml}
          <div class="tt__real">Vencedor no estado: <b>${vencedor}</b> · ${turnoLabel}</div>
          ${mgNote}`;
      }
    } else {
      const l = S.values[hovered], f = 100 - l;
      const refTurn = S.turn === 't1' ? 't1' : 't2';
      const realL = e[refTurn].lula, realF = e[refTurn].flavio;
      tip.innerHTML = `
        <div class="tt__title">${e.nome} (${hovered})</div>
        <div class="tt__sub">${e.regiao} · ~${fmt(e.eleitores, 1)} mi de eleitores</div>
        <div class="tt__row tt__row--lula"><span>Lula</span><span>${fmt(l)}%</span></div>
        <div class="tt__bar"><i style="width:${l}%;background:var(--lula)"></i><i style="width:${f}%;background:var(--flavio)"></i></div>
        <div class="tt__row tt__row--flavio"><span>Flávio Bolsonaro</span><span>${fmt(f)}%</span></div>
        <div class="tt__real">Resultado oficial (${refTurn === 't1' ? '1ºT' : '2ºT'}): Lula ${fmt(realL)}% · Flávio ${fmt(realF)}%</div>`;
    }
  }

  /* ---------------- Card de Detalhes do Estado (Mobile e Toque) ---------------- */
  const stateCard = $('state-card');
  function showStateCard(uf) {
    if (!stateCard || !uf) return;
    const e = DATA.estados[uf];
    const sw = SWINGS[uf];
    if (!e) return;

    $('sc-uf').textContent = uf;
    $('sc-name').textContent = e.nome;
    $('sc-sub').textContent = `${e.regiao} · ~${fmt(e.eleitores, 1)}M eleitores`;

    const body = $('sc-content');
    if (S.mode === 'explore') {
      if (S.turn === 'diff') {
        const signL = sw.diffL >= 0 ? '+' : '';
        const signF = sw.diffF >= 0 ? '+' : '';
        const flipBadge = sw.flipped
          ? `<span class="sc-badge-flip">⭐ Virou para Lula no 2º Turno!</span>`
          : '';

        body.innerHTML = `
          <div class="sc-row sc-row--lula">
            <span>Lula (${fmt(e.t1.lula)}% ➔ ${fmt(e.t2.lula)}%)</span>
            <b>${signL}${fmt(sw.diffL)} p.p.</b>
          </div>
          <div class="sc-row sc-row--flavio">
            <span>Flávio (${fmt(e.t1.flavio)}% ➔ ${fmt(e.t2.flavio)}%)</span>
            <b>${signF}${fmt(sw.diffF)} p.p.</b>
          </div>
          <div class="sc-real">Saldo líquido pró-${sw.net >= 0 ? 'Lula' : 'Flávio'}: <b>${fmt(Math.abs(sw.net))} p.p.</b> ${flipBadge}</div>
        `;
      } else {
        const dTurn = e[S.turn];
        const vencedor = dTurn.vencedor === 'lula' ? 'Lula' : 'Flávio';
        const turnoLabel = S.turn === 't1' ? '1º Turno' : '2º Turno';
        const outrosHtml = dTurn.outros > 0
          ? `<div class="sc-row muted"><span>Outros candidatos</span><span>${fmt(dTurn.outros)}%</span></div>`
          : '';
        const mgNote = uf === 'MG'
          ? (S.turn === 't1' ? '<div class="sc-badge-flip" style="color:var(--flavio)">⭐ MG votou em Flávio no 1º Turno</div>'
                             : '<div class="sc-badge-flip">⭐ Fiel da Balança: MG virou para Lula no 2ºT!</div>')
          : '';

        body.innerHTML = `
          <div class="sc-row sc-row--lula"><span>Lula</span><b>${fmt(dTurn.lula)}%</b></div>
          <div class="sc-bar">
            <i style="width:${dTurn.lula}%;background:var(--lula)"></i>
            ${dTurn.outros > 0 ? `<i style="width:${dTurn.outros}%;background:#8b5cf6"></i>` : ''}
            <i style="width:${dTurn.flavio}%;background:var(--flavio)"></i>
          </div>
          <div class="sc-row sc-row--flavio"><span>Flávio Bolsonaro</span><b>${fmt(dTurn.flavio)}%</b></div>
          ${outrosHtml}
          <div class="sc-real">Vencedor oficial: <b>${vencedor}</b> (${turnoLabel})</div>
          ${mgNote}
        `;
      }
    } else {
      const l = S.values[uf], f = 100 - l;
      const refTurn = S.turn === 't1' ? 't1' : 't2';
      const realL = e[refTurn].lula, realF = e[refTurn].flavio;
      body.innerHTML = `
        <div class="sc-row sc-row--lula"><span>Lula</span><b>${fmt(l)}%</b></div>
        <div class="sc-bar"><i style="width:${l}%;background:var(--lula)"></i><i style="width:${f}%;background:var(--flavio)"></i></div>
        <div class="sc-row sc-row--flavio"><span>Flávio Bolsonaro</span><b>${fmt(f)}%</b></div>
        <div class="sc-real">Resultado oficial (${refTurn === 't1' ? '1ºT' : '2ºT'}): Lula ${fmt(realL)}% · Flávio ${fmt(realF)}%</div>
      `;
    }
    stateCard.classList.remove('hidden');
    $('hint').style.opacity = 0;
  }

  function hideStateCard() {
    if (stateCard) stateCard.classList.add('hidden');
  }

  svg.addEventListener('mousemove', (evt) => {
    if (evt.pointerType === 'touch') return;
    const el = evt.target.closest('[data-uf]');
    if (!el) { hovered = null; tip.classList.remove('on'); return; }
    hovered = el.dataset.uf;
    renderTip();
    const pad = 16;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    const r = tip.getBoundingClientRect();
    if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = evt.clientY - r.height - pad;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.classList.add('on');
    $('hint').style.opacity = 0;
  });

  svg.addEventListener('mouseleave', () => {
    hovered = null;
    tip.classList.remove('on');
  });

  svg.addEventListener('pointerdown', (evt) => {
    const el = evt.target.closest('[data-uf]');
    if (el) {
      evt.preventDefault();
      const uf = el.dataset.uf;
      hovered = uf;

      // Haptic feedback no toque mobile
      if (navigator.vibrate) {
        try { navigator.vibrate(14); } catch (_) {}
      }

      // Desbloqueia WebAudio no primeiro toque
      if (actx && actx.state === 'suspended') {
        actx.resume();
      }

      playerClick(uf, evt);
      renderTip();

      // No mobile ou no modo explorar, abre o card detalhado do estado
      if (window.innerWidth <= 768 || S.mode === 'explore') {
        showStateCard(uf);
        tip.classList.remove('on');
      }
    } else if (S.mode === 'explore') {
      hideStateCard();
    }
  });

  if ($('sc-close')) {
    $('sc-close').addEventListener('click', (e) => {
      e.stopPropagation();
      hideStateCard();
    });
  }

  /* ---------------- Dashboard e Gráficos de Variação ---------------- */
  function renderChartsList() {
    const list = $('chart-list-items');
    if (!list) return;

    let items = Object.values(SWINGS);
    if (S.chartFilter !== 'todos') {
      items = items.filter((s) => s.regiao === S.chartFilter);
    }

    if (S.chartSort === 'swingLula') items.sort((a, b) => b.diffL - a.diffL);
    else if (S.chartSort === 'swingFlavio') items.sort((a, b) => b.diffF - a.diffF);
    else if (S.chartSort === 'netSwing') items.sort((a, b) => b.net - a.net);
    else if (S.chartSort === 'name') items.sort((a, b) => a.nome.localeCompare(b.nome));

    // Valor máximo para normalizar a largura visual da barra (max ~ 9 p.p.)
    const maxVal = 9.5;

    list.innerHTML = items.map((s) => {
      const pctBarL = clamp((s.diffL / maxVal) * 100, 5, 100);
      const pctBarF = clamp((s.diffF / maxVal) * 100, 5, 100);
      const flipBadge = s.flipped ? `<span class="badge-flip">Virou!</span>` : '';

      return `
        <div class="chart-row">
          <div class="chart-row__info">
            <span class="chart-row__name">${s.nome} (${s.uf}) ${flipBadge}</span>
            <span class="chart-row__reg">${s.regiao} · ~${fmt(s.eleitores, 1)}M eleit.</span>
          </div>
          <div class="chart-bar-wrap">
            <div class="chart-bar-header" style="color:var(--lula)">
              <span>Lula</span>
              <b>+${fmt(s.diffL)} p.p.</b>
            </div>
            <div class="chart-bar-track">
              <div class="chart-bar-fill chart-bar-fill--lula" style="width:${pctBarL}%"></div>
            </div>
          </div>
          <div class="chart-bar-wrap">
            <div class="chart-bar-header" style="color:var(--flavio)">
              <span>Flávio</span>
              <b>+${fmt(s.diffF)} p.p.</b>
            </div>
            <div class="chart-bar-track">
              <div class="chart-bar-fill chart-bar-fill--flavio" style="width:${pctBarF}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRegionCards() {
    const grid = $('region-grid-items');
    if (!grid) return;

    const byReg = {};
    for (const r of REGIONS) byReg[r] = { regiao: r, w: 0, l1: 0, l2: 0, f1: 0, f2: 0, ufs: [] };

    for (const uf of UFS) {
      const st = DATA.estados[uf];
      const r = byReg[st.regiao];
      const w = st.eleitores;
      r.w += w;
      r.l1 += st.t1.lula * w;
      r.l2 += st.t2.lula * w;
      r.f1 += st.t1.flavio * w;
      r.f2 += st.t2.flavio * w;
      r.ufs.push(uf);
    }

    grid.innerHTML = REGIONS.map((rName) => {
      const d = byReg[rName];
      const avgL1 = d.l1 / d.w;
      const avgL2 = d.l2 / d.w;
      const avgF1 = d.f1 / d.w;
      const avgF2 = d.f2 / d.w;
      const gainL = avgL2 - avgL1;
      const gainF = avgF2 - avgF1;

      return `
        <div class="region-card">
          <h3>Região ${rName}</h3>
          <p class="muted small">${d.ufs.join(', ')} · ~${fmt(d.w, 1)}M eleitores</p>
          <div class="region-card__stat" style="color:var(--lula)">
            <span>Lula: ${fmt(avgL1, 1)}% ➔ ${fmt(avgL2, 1)}%</span>
            <b>+${fmt(gainL, 2)} p.p.</b>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill chart-bar-fill--lula" style="width:${clamp(gainL * 12, 10, 100)}%"></div>
          </div>
          <div class="region-card__stat" style="color:var(--flavio)">
            <span>Flávio: ${fmt(avgF1, 1)}% ➔ ${fmt(avgF2, 1)}%</span>
            <b>+${fmt(gainF, 2)} p.p.</b>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill chart-bar-fill--flavio" style="width:${clamp(gainF * 12, 10, 100)}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function openChartsModal() {
    renderChartsList();
    renderRegionCards();
    show('overlay-charts');
  }

  /* ---------------- Fluxo de Partida ---------------- */
  let countdownTimers = [];
  function startGame() {
    countdownTimers.forEach(clearTimeout);
    countdownTimers = [];
    S.mode = 'countdown'; S.paused = false;
    S.countdownText = '3';

    // Efeito cascata: zerando todos os estados para NEUTRO
    const order = [...UFS].sort((a, b) => centers[a].y - centers[b].y);
    order.forEach((uf, i) => countdownTimers.push(setTimeout(() => {
      S.values[uf] = NEUTRAL; S.owners[uf] = 'none'; S.dirty.add(uf);
      beep(300 + i * 18, 0.03, 'sine', 0.02);
    }, i * 40)));

    ['3', '2', '1', 'Vai!'].forEach((txt, i) => countdownTimers.push(setTimeout(() => {
      S.countdownText = txt;
      beep(txt === 'Vai!' ? 880 : 440, txt === 'Vai!' ? 0.25 : 0.1, 'triangle', 0.06);
    }, i * 650)));

    countdownTimers.push(setTimeout(beginPlay, 2100));

    S.ai = S.side === 'lula' ? 'flavio' : 'lula';
    $('feed').innerHTML = '';
    $('you-lula').classList.toggle('on', S.side === 'lula');
    $('you-flavio').classList.toggle('on', S.side === 'flavio');
    const roundName = S.turn === 't1' ? '1º Turno' : '2º Turno';
    $('mode-label').textContent = `Disputa do ${roundName} · você é ${NAMES[S.side]} · IA ${$('diff-' + S.diff).textContent}`;
    log(`🧹 Mapa zerado para a disputa do <b>${roundName}</b>! Todos os estados neutros.`, 'gold');
    hide('overlay-start'); hide('overlay-end');
  }

  function beginPlay() {
    hideStateCard();
    UFS.forEach((uf) => { S.values[uf] = NEUTRAL; S.owners[uf] = 'none'; S.dirty.add(uf); });
    S.mode = 'playing'; S.paused = false;
    S.ai = S.side === 'lula' ? 'flavio' : 'lula';
    S.energy = 100; S.aiEnergy = 60; S.timeLeft = GAME_TIME;
    S.combo = 0; S.cd = { comicio: 0, caravana: 0, debate: 0 }; S.aiCd = { comicio: 4, caravana: 8, debate: 15 };
    S.aiTarget = null; S.aiClick = 1.2; S.nextEvent = rand(8, 12);
    svg.classList.remove('locked');
    log(`🏁 Campanha iniciada! Conquiste os estados antes do fim do tempo (${GAME_TIME}s).`, 'gold');
    beep(523, 0.1, 'triangle', 0.06); beep(659, 0.1, 'triangle', 0.06, 0.1); beep(784, 0.2, 'triangle', 0.06, 0.2);
  }

  function endGame() {
    S.mode = 'ended';
    svg.classList.add('locked');
    const l = national(), f = 100 - l;
    const winner = l >= 50 ? 'lula' : 'flavio';
    const won = winner === S.side;
    const nL = UFS.filter((uf) => S.owners[uf] === 'lula').length;
    const nF = UFS.filter((uf) => S.owners[uf] === 'flavio').length;
    const refTurn = S.turn === 'diff' ? 't2' : S.turn;
    const roundName = refTurn === 't1' ? '1º Turno' : '2º Turno';

    $('end-eyebrow').textContent = won ? `Vitória no ${roundName}!` : `Derrota no ${roundName}`;
    $('end-title').textContent = won ? `Você liderou com ${NAMES[S.side]}! 🎉` : `${NAMES[winner]} levou a melhor desta vez.`;
    $('end-lula').textContent = fmt(l) + '%';
    $('end-flavio').textContent = fmt(f) + '%';
    $('end-lula-st').textContent = nL + ' estados';
    $('end-flavio-st').textContent = nF + ' estados';

    const realNat = DATA.nacional[refTurn];
    const realTarget = S.side === 'lula' ? realNat.lula : realNat.flavio;
    const playerPct = S.side === 'lula' ? l : f;
    const diff = playerPct - realTarget;

    $('end-compare').innerHTML = `Na eleição real do ${roundName}, ${NAMES[S.side]} teve <b>${fmt(realTarget)}%</b>. Na sua partida, conquistou <b>${fmt(playerPct)}%</b> (${diff >= 0 ? '+' : ''}${fmt(diff)} p.p.). Estados diferentes do resultado oficial:`;

    const flips = $('end-flips');
    flips.innerHTML = '';
    UFS.forEach((uf) => {
      const realWinner = DATA.estados[uf][refTurn].vencedor;
      if (S.owners[uf] !== 'none' && realWinner !== S.owners[uf]) {
        const li = document.createElement('li');
        li.className = 'to-' + S.owners[uf];
        li.textContent = `${uf} → ${S.owners[uf] === 'lula' ? 'Lula' : 'Flávio'}`;
        flips.appendChild(li);
      }
    });
    if (!flips.children.length) flips.innerHTML = '<li class="muted">Nenhum — mapa idêntico ao oficial!</li>';
    show('overlay-end');
    if (won) {
      if (navigator.vibrate) {
        try { navigator.vibrate([40, 60, 40, 60, 100]); } catch (_) {}
      }
      confetti();
      [523, 659, 784, 1046].forEach((fr, i) => beep(fr, 0.2, 'triangle', 0.07, i * 0.12));
    }
    else { [392, 330, 262].forEach((fr, i) => beep(fr, 0.25, 'sine', 0.06, i * 0.15)); }
  }

  function exploreReal() {
    countdownTimers.forEach(clearTimeout);
    countdownTimers = [];
    S.mode = 'explore'; S.paused = false;
    hideStateCard();
    setTurn(S.turn);
    $('you-lula').classList.remove('on'); $('you-flavio').classList.remove('on');
    svg.classList.add('locked');
    hide('overlay-start'); hide('overlay-end');
  }

  function confetti() {
    const colors = S.side === 'lula' ? ['#ef3b4f', '#ff8a98', '#fbbf24', '#fff'] : ['#22c55e', '#86efac', '#fbbf24', '#fff'];
    for (let i = 0; i < 110; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = pick(colors);
      c.style.animationDuration = rand(2, 4) + 's';
      c.style.animationDelay = rand(0, 0.8) + 's';
      c.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5200);
    }
  }

  const show = (id) => $(id).classList.remove('hidden');
  const hide = (id) => $(id).classList.add('hidden');

  /* ---------------- Loop de Animação ---------------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (S.mode === 'playing' && !S.paused) {
      S.timeLeft -= dt;
      S.energy = Math.min(100, S.energy + PLAYER_REGEN * dt);
      for (const k in S.cd) S.cd[k] = Math.max(0, S.cd[k] - dt);
      if (performance.now() - S.lastClick > 650 && S.combo) { S.combo = 0; $('combo').textContent = ''; }
      aiTick(dt);
      S.nextEvent -= dt;
      if (S.nextEvent <= 0) { randomEvent(); S.nextEvent = rand(9, 14); }
      if (S.timeLeft <= 0) { S.timeLeft = 0; renderMap(); renderHUD(); endGame(); }
    }
    if (S.dirty.size) { renderMap(); if (hovered) renderTip(); }
    renderHUD();
    requestAnimationFrame(frame);
  }

  /* ---------------- Event Listeners ---------------- */
  function choose(side) {
    S.side = side;
    $('pick-lula').classList.toggle('on', side === 'lula');
    $('pick-flavio').classList.toggle('on', side === 'flavio');
    const b = $('btn-start');
    b.disabled = false;
    b.textContent = `Começar como ${NAMES[side]}`;
  }

  $('pick-lula').addEventListener('click', () => choose('lula'));
  $('pick-flavio').addEventListener('click', () => choose('flavio'));

  // Seletor de turno no topo
  $('btn-t1').addEventListener('click', () => setTurn('t1'));
  $('btn-t2').addEventListener('click', () => setTurn('t2'));
  $('btn-diff').addEventListener('click', () => setTurn('diff'));

  // Botão abrir gráficos
  $('btn-open-charts').addEventListener('click', openChartsModal);
  $('btn-close-charts').addEventListener('click', () => hide('overlay-charts'));
  $('overlay-charts').addEventListener('click', (e) => {
    if (e.target.id === 'overlay-charts') hide('overlay-charts');
  });

  // Abas do modal de gráficos
  $('tab-ranking').addEventListener('click', () => {
    $('tab-ranking').classList.add('active');
    $('tab-regions').classList.remove('active');
    $('ranking-section').classList.remove('hidden');
    $('regions-section').classList.add('hidden');
  });
  $('tab-regions').addEventListener('click', () => {
    $('tab-regions').classList.add('active');
    $('tab-ranking').classList.remove('active');
    $('regions-section').classList.remove('hidden');
    $('ranking-section').classList.add('hidden');
  });

  // Filtros de região do ranking
  document.querySelectorAll('#chart-region-filters .chip').forEach((c) => {
    c.addEventListener('click', () => {
      document.querySelectorAll('#chart-region-filters .chip').forEach((x) => x.classList.remove('chip--on'));
      c.classList.add('chip--on');
      S.chartFilter = c.dataset.filter;
      renderChartsList();
    });
  });

  // Ordenação do ranking
  $('chart-sort-select').addEventListener('change', (e) => {
    S.chartSort = e.target.value;
    renderChartsList();
  });

  // Seletor de turno no modal inicial
  if ($('round-t1')) $('round-t1').addEventListener('click', () => setTurn('t1'));
  if ($('round-t2')) $('round-t2').addEventListener('click', () => setTurn('t2'));

  document.querySelectorAll('.chip[data-diff]').forEach((c) => c.addEventListener('click', () => {
    document.querySelectorAll('.chip[data-diff]').forEach((x) => x.classList.remove('chip--on'));
    c.classList.add('chip--on');
    S.diff = c.dataset.diff;
  }));

  $('btn-start').addEventListener('click', startGame);
  $('btn-explore').addEventListener('click', exploreReal);
  $('btn-again').addEventListener('click', () => { hide('overlay-end'); show('overlay-start'); });
  $('btn-reset-real').addEventListener('click', exploreReal);
  $('btn-menu').addEventListener('click', () => {
    if (S.mode === 'playing') S.paused = true;
    show('overlay-start');
  });
  $('overlay-start').addEventListener('click', (e) => {
    if (e.target.id === 'overlay-start' && S.mode === 'playing') { S.paused = false; hide('overlay-start'); }
  });
  $('btn-sound').addEventListener('click', () => {
    S.sound = !S.sound;
    $('btn-sound').textContent = S.sound ? '🔊' : '🔇';
  });

  $('act-comicio').addEventListener('click', () => useSpecial('comicio', S.side));
  $('act-caravana').addEventListener('click', () => useSpecial('caravana', S.side));
  $('act-debate').addEventListener('click', () => useSpecial('debate', S.side));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('overlay-charts').classList.contains('hidden')) {
        hide('overlay-charts');
        return;
      }
      if (S.mode === 'playing') {
        S.paused = !S.paused;
        S.paused ? show('overlay-start') : hide('overlay-start');
      }
      return;
    }
    if (S.mode !== 'playing') return;
    if (e.key === '1') useSpecial('comicio', S.side);
    if (e.key === '2') useSpecial('caravana', S.side);
    if (e.key === '3') useSpecial('debate', S.side);
  });

  // Inicializa em modo explorar (2º turno ativo por padrão)
  setTurn('t2');
  svg.classList.add('locked');
  requestAnimationFrame(frame);
})();
