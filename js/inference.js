/*
 * Inferência Mamdani implementada manualmente (sem bibliotecas fuzzy).
 * Cinco etapas como funções puras: fuzzificação → regras (mínimo) → implicação (recorte)
 * → agregação (máximo) → defuzzificação (centroide por pontos médios).
 */
(function (root) {
  'use strict';
  const F = (root.Fuzzy = root.Fuzzy || {});
  const M = F.membership;
  const R = F.rules;

  const OUT_WIDTH = 30;                       // domínio de saída: 0..30 min
  const ALLOWED_STEPS = [0.1, 0.05, 0.01];

  /* Etapa 1 — Fuzzificação: três graus de U e três de T (inclusive zeros). */
  function fuzzify(U, T) {
    const fz = { U: U, T: T, umidade: {}, temperatura: {} };
    M.VARIABLES.umidade.sets.forEach(function (s) { fz.umidade[s.id] = M.membership(U, s.params); });
    M.VARIABLES.temperatura.sets.forEach(function (s) { fz.temperatura[s.id] = M.membership(T, s.params); });
    return fz;
  }

  /* Etapa 2 — Avaliação das regras: h(r) = min(μumidade(U), μtemperatura(T)). */
  function evaluateRules(fuzz, consequents) {
    return R.buildRules(consequents).map(function (r) {
      const muU = fuzz.umidade[r.umidade];
      const muT = fuzz.temperatura[r.temperatura];
      const h = Math.min(muU, muT);
      return Object.assign({}, r, { muU: muU, muT: muT, h: h, active: h > 0 });
    });
  }

  /* Grade de pontos médios: N = 30/Δz, z(k) = (k + 0,5)·Δz. */
  function makeGrid(dz) {
    if (!ALLOWED_STEPS.some(function (s) { return Math.abs(s - dz) < 1e-12; })) {
      throw new Error('Δz deve ser 0,1; 0,05 ou 0,01 minuto.');
    }
    const N = Math.round(OUT_WIDTH / dz);
    const z = new Float64Array(N);
    for (let k = 0; k < N; k++) z[k] = (k + 0.5) * dz;
    return { dz: dz, N: N, z: z };
  }

  /* Etapa 3 — Implicação: μ_r(z) = min(h(r), μ_consequente(z)). Regras com h = 0 → null. */
  function implicate(rules, grid) {
    return rules.map(function (r) {
      if (!r.active) return null;
      const params = M.getSet('tempo', r.consequente).params;
      const clip = new Float64Array(grid.N);
      for (let k = 0; k < grid.N; k++) clip[k] = Math.min(r.h, M.membership(grid.z[k], params));
      return clip;
    });
  }

  /* Etapa 4 — Agregação: máximo ponto a ponto (nunca soma). */
  function aggregate(clips, grid) {
    const agg = new Float64Array(grid.N);
    clips.forEach(function (clip) {
      if (!clip) return;
      for (let k = 0; k < grid.N; k++) if (clip[k] > agg[k]) agg[k] = clip[k];
    });
    return agg;
  }

  /* Etapa 5 — Defuzzificação: z* = Σ z(k)·μ(z(k)) / Σ μ(z(k)). */
  function defuzzify(grid, agg) {
    let num = 0, den = 0;
    for (let k = 0; k < grid.N; k++) { num += grid.z[k] * agg[k]; den += agg[k]; }
    if (!(den > 0)) {
      return { valid: false, numerator: num, denominator: den, centroid: null,
               message: 'Não há saída agregada válida: a soma das pertinências agregadas é zero.' };
    }
    return { valid: true, numerator: num, denominator: den, centroid: num / den, message: '' };
  }

  /* Pipeline completo (Calcular). */
  function infer(values) {
    const fuzz = fuzzify(values.U, values.T);
    const rules = evaluateRules(fuzz, values.consequents);
    const grid = makeGrid(values.dz);
    const clips = implicate(rules, grid);
    const agg = aggregate(clips, grid);
    const defuzz = defuzzify(grid, agg);
    return { fuzz: fuzz, rules: rules, grid: grid, clips: clips, aggregate: agg, defuzz: defuzz };
  }

  /* Avaliações pontuais (usadas por testes e pelo desenho dos gráficos; não alteram o cálculo). */
  function clippedAt(rule, z) {
    if (!rule.active) return 0;
    return Math.min(rule.h, M.membership(z, M.getSet('tempo', rule.consequente).params));
  }
  function aggregateAt(rules, z) {
    let m = 0;
    for (let i = 0; i < rules.length; i++) { const v = clippedAt(rules[i], z); if (v > m) m = v; }
    return m;
  }

  F.inference = {
    ALLOWED_STEPS: ALLOWED_STEPS, OUT_WIDTH: OUT_WIDTH,
    fuzzify: fuzzify, evaluateRules: evaluateRules, makeGrid: makeGrid,
    implicate: implicate, aggregate: aggregate, defuzzify: defuzzify, infer: infer,
    clippedAt: clippedAt, aggregateAt: aggregateAt
  };
})(typeof window !== 'undefined' ? window : globalThis);
