/*
 * Gráficos em SVG puro (sem bibliotecas). Funções devolvem strings SVG.
 * A amostragem aqui serve apenas para DESENHAR; o resultado numérico vem de inference.js.
 */
(function (root) {
  'use strict';
  const F = (root.Fuzzy = root.Fuzzy || {});
  const M = F.membership, I = F.inference, fmt = F.format.num;

  const LABEL = {};
  Object.keys(M.VARIABLES).forEach(function (v) { M.VARIABLES[v].sets.forEach(function (s) { LABEL[s.id] = s.label; }); });
  const color = function (id) { return 'var(--c-' + id + ')'; };
  const f1 = function (n) { return (Math.round(n * 100) / 100).toString(); };

  /* Moldura com eixos, grade e rótulos. */
  function frame(o) {
    const W = o.width || 640, H = o.height || 320;
    const m = o.margin || { l: 58, r: 20, t: o.legend === false ? 22 : 46, b: 52 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const x0 = o.xDomain[0], x1 = o.xDomain[1];
    const sx = function (x) { return m.l + (x - x0) / (x1 - x0) * pw; };
    const sy = function (y) { return m.t + (1 - y) * ph; };
    let s = '';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (y) {
      s += '<line class="grid" x1="' + f1(m.l) + '" x2="' + f1(m.l + pw) + '" y1="' + f1(sy(y)) + '" y2="' + f1(sy(y)) + '"/>';
      s += '<text class="tick" x="' + f1(m.l - 8) + '" y="' + f1(sy(y) + 4) + '" text-anchor="end">' + fmt(y, 2) + '</text>';
    });
    o.xTicks.forEach(function (x) {
      s += '<line class="tickmark" x1="' + f1(sx(x)) + '" x2="' + f1(sx(x)) + '" y1="' + f1(m.t + ph) + '" y2="' + f1(m.t + ph + 5) + '"/>';
      s += '<text class="tick" x="' + f1(sx(x)) + '" y="' + f1(m.t + ph + 19) + '" text-anchor="middle">' + fmt(x) + '</text>';
    });
    s += '<line class="axis" x1="' + f1(m.l) + '" x2="' + f1(m.l) + '" y1="' + f1(m.t) + '" y2="' + f1(m.t + ph) + '"/>';
    s += '<line class="axis" x1="' + f1(m.l) + '" x2="' + f1(m.l + pw) + '" y1="' + f1(m.t + ph) + '" y2="' + f1(m.t + ph) + '"/>';
    s += '<text class="axlabel" x="' + f1(m.l + pw / 2) + '" y="' + f1(H - 8) + '" text-anchor="middle">' + o.xLabel + '</text>';
    s += '<text class="axlabel" transform="translate(14 ' + f1(m.t + ph / 2) + ') rotate(-90)" text-anchor="middle">Grau de pertinência</text>';
    return { W: W, H: H, m: m, pw: pw, ph: ph, sx: sx, sy: sy, base: s };
  }

  function wrap(fr, inner, label) {
    return '<svg viewBox="0 0 ' + fr.W + ' ' + fr.H + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' + fr.base + inner + '</svg>';
  }

  /* Legenda no topo: [{label, color, dash?, fill?}] */
  function legend(fr, items) {
    let x = fr.m.l, s = '';
    items.forEach(function (it) {
      if (it.fill) s += '<rect x="' + f1(x) + '" y="9" width="16" height="10" rx="2" style="fill:' + it.color + ';fill-opacity:.35;stroke:' + it.color + ';stroke-width:1.5"/>';
      else s += '<line x1="' + f1(x) + '" x2="' + f1(x + 16) + '" y1="14" y2="14" style="stroke:' + it.color + ';stroke-width:3" ' + (it.dash ? 'stroke-dasharray="4 3"' : '') + '/>';
      s += '<text class="legend" x="' + f1(x + 22) + '" y="18">' + it.label + '</text>';
      x += 22 + it.label.length * 6.8 + 18;
    });
    return s;
  }

  function trapezoidPoints(p, dom) {
    const pts = [];
    if (p[0] > dom[0]) pts.push([dom[0], 0]);
    pts.push([p[0], 0], [p[1], 1], [p[2], 1], [p[3], 0]);
    if (p[3] < dom[1]) pts.push([dom[1], 0]);
    return pts.filter(function (pt, i) { return i === 0 || pt[0] !== pts[i - 1][0] || pt[1] !== pts[i - 1][1]; });
  }
  function pathOf(fr, pts, close) {
    const d = pts.map(function (p, i) { return (i ? 'L' : 'M') + f1(fr.sx(p[0])) + ' ' + f1(fr.sy(p[1])); }).join(' ');
    return close ? d + ' Z' : d;
  }
  function samplePts(fn, step) {
    const pts = [];
    for (let i = 0; i <= I.OUT_WIDTH / step + 1e-9; i++) { const z = Math.min(30, i * step); pts.push([z, fn(z)]); }
    return pts;
  }
  function ticksFor(dom, step) { const t = []; for (let x = dom[0]; x <= dom[1] + 1e-9; x += step) t.push(x); return t; }

  /* ---------- Gráfico de entrada (umidade / temperatura) ---------- */
  function membershipChart(varId, value, degrees) {
    const v = M.VARIABLES[varId];
    const fr = frame({ xDomain: v.domain, xTicks: ticksFor(v.domain, varId === 'umidade' ? 20 : 5), xLabel: v.label + ' (' + v.unit + ')', width: 480, height: 300, margin: { l: 52, r: 16, t: 44, b: 50 } });
    let s = legend(fr, v.sets.map(function (st) { return { label: st.label, color: color(st.id) }; }));
    v.sets.forEach(function (st) {
      const pts = trapezoidPoints(st.params, v.domain);
      s += '<path d="' + pathOf(fr, pts, true) + '" style="fill:' + color(st.id) + ';fill-opacity:.1;stroke:none"/>';
      s += '<path d="' + pathOf(fr, pts, false) + '" style="fill:none;stroke:' + color(st.id) + ';stroke-width:2.5;stroke-linejoin:round"/>';
    });
    if (typeof value === 'number' && Number.isFinite(value)) {
      const xv = fr.sx(value), right = value > (v.domain[0] + v.domain[1]) / 2;
      s += '<line class="inputline" x1="' + f1(xv) + '" x2="' + f1(xv) + '" y1="' + f1(fr.m.t) + '" y2="' + f1(fr.m.t + fr.ph) + '"/>';
      s += '<text class="lbl strong" x="' + f1(xv + (right ? -6 : 6)) + '" y="' + f1(fr.m.t - 7) + '" text-anchor="' + (right ? 'end' : 'start') + '">' + v.symbol + ' = ' + fmt(value) + ' ' + v.unit + '</text>';
      if (degrees) v.sets.forEach(function (st) {
        s += '<circle cx="' + f1(xv) + '" cy="' + f1(fr.sy(degrees[st.id])) + '" r="5" style="fill:' + color(st.id) + ';stroke:var(--panel);stroke-width:2"/>';
      });
    }
    return wrap(fr, s, 'Conjuntos fuzzy de ' + v.label.toLowerCase() + ' com a entrada marcada');
  }

  /* ---------- Implicação: consequente original × recorte ---------- */
  function consequentChart(rule, compact) {
    const set = M.getSet('tempo', rule.consequente), col = color(set.id);
    const fr = frame({
      xDomain: [0, 30], xTicks: ticksFor([0, 30], compact ? 10 : 5), xLabel: 'Tempo de irrigação (min)',
      width: compact ? 360 : 640, height: compact ? 230 : 320,
      legend: !!compact === false, margin: compact ? { l: 46, r: 12, t: 18, b: 44 } : undefined
    });
    const orig = samplePts(function (z) { return M.membership(z, set.params); }, 0.05);
    const clip = samplePts(function (z) { return Math.min(rule.h, M.membership(z, set.params)); }, 0.05);
    let s = '';
    if (!compact) s += legend(fr, [{ label: 'consequente original (' + set.label + ')', color: col, dash: true }, { label: 'recorte min(h, μ)', color: col, fill: true }]);
    s += '<path d="' + pathOf(fr, orig, false) + '" style="fill:none;stroke:' + col + ';stroke-width:2;stroke-dasharray:5 4"/>';
    s += '<path d="' + pathOf(fr, clip.concat([[30, 0]]), true) + '" style="fill:' + col + ';fill-opacity:.35;stroke:' + col + ';stroke-width:2.5"/>';
    const yh = fr.sy(rule.h);
    s += '<line class="hline" x1="' + f1(fr.m.l) + '" x2="' + f1(fr.m.l + fr.pw) + '" y1="' + f1(yh) + '" y2="' + f1(yh) + '"/>';
    const lab = rule.active ? 'h = ' + fmt(rule.h) : 'h = 0 (regra inativa: sem contribuição)';
    s += '<text class="lbl strong" x="' + f1(fr.m.l + fr.pw - 4) + '" y="' + f1(Math.min(yh - 6, fr.m.t + fr.ph - 8)) + '" text-anchor="end">' + lab + '</text>';
    return wrap(fr, s, rule.id + ': consequente ' + set.label + ' recortado na altura ' + fmt(rule.h));
  }

  /* ---------- Saída: agregação (e centroide) ---------- */
  function outputChart(rules, centroid) {
    const T = M.VARIABLES.tempo;
    const fr = frame({ xDomain: [0, 30], xTicks: ticksFor([0, 30], 5), xLabel: 'Tempo de irrigação (min)' });
    const items = T.sets.map(function (st) { return { label: st.label, color: color(st.id), dash: true }; });
    items.push({ label: 'saída agregada (máximo dos recortes)', color: 'var(--agg)', fill: true });
    let s = legend(fr, items);
    T.sets.forEach(function (st) {
      s += '<path d="' + pathOf(fr, trapezoidPoints(st.params, [0, 30]), false) + '" style="fill:none;stroke:' + color(st.id) + ';stroke-width:1.5;stroke-dasharray:4 4;opacity:.75"/>';
    });
    const agg = samplePts(function (z) { return I.aggregateAt(rules, z); }, 0.05);
    s += '<path d="' + pathOf(fr, agg.concat([[30, 0]]), true) + '" style="fill:var(--agg);fill-opacity:.28;stroke:none"/>';
    rules.forEach(function (r) {
      if (!r.active) return;
      s += '<path d="' + pathOf(fr, samplePts(function (z) { return I.clippedAt(r, z); }, 0.05), false) + '" style="fill:none;stroke:' + color(r.consequente) + ';stroke-width:1.5;opacity:.9"/>';
    });
    s += '<path d="' + pathOf(fr, agg, false) + '" style="fill:none;stroke:var(--agg);stroke-width:3;stroke-linejoin:round"/>';
    if (typeof centroid === 'number' && Number.isFinite(centroid)) {
      const xc = fr.sx(centroid), right = centroid > 15;
      s += '<line class="centroid" x1="' + f1(xc) + '" x2="' + f1(xc) + '" y1="' + f1(fr.m.t) + '" y2="' + f1(fr.m.t + fr.ph) + '"/>';
      s += '<text class="lbl strong" x="' + f1(xc + (right ? -7 : 7)) + '" y="' + f1(fr.m.t + 15) + '" text-anchor="' + (right ? 'end' : 'start') + '">centroide z* = ' + fmt(centroid, 2) + ' min</text>';
    }
    return wrap(fr, s, centroid === undefined || centroid === null ? 'Saída agregada dos recortes' : 'Saída agregada com centroide em ' + fmt(centroid, 2) + ' minutos');
  }

  F.visualization = { membershipChart: membershipChart, consequentChart: consequentChart, outputChart: outputChart, LABEL: LABEL };
})(typeof window !== 'undefined' ? window : globalThis);
