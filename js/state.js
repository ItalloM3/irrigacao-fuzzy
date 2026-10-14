/* Estado da aplicação e transições (sem DOM). Calcular e Avançar usam as mesmas funções puras. */
(function (root) {
  'use strict';
  const F = (root.Fuzzy = root.Fuzzy || {});
  const I = F.inference;

  function defaultConfig() {
    return { U: '35', T: '30', dz: '0.1', consequents: F.rules.DEFAULT_CONSEQUENTS.slice() };
  }

  function createState() {
    return { config: defaultConfig(), step: 0, stage: {}, selectedRule: null };
  }

  function firstActive(rules) {
    for (let i = 0; i < rules.length; i++) if (rules[i].active) return i;
    return 0;
  }

  /** Descarta resultados e reinicia a sequência. Retorna true se havia resultados. */
  function invalidate(state) {
    const had = state.step > 0;
    state.step = 0; state.stage = {}; state.selectedRule = null;
    return had;
  }

  function restoreDefaults(state) {
    state.config = defaultConfig();
    invalidate(state);
  }

  /** Calcular: executa todas as etapas de uma vez. */
  function runAll(state, values) {
    const r = I.infer(values);
    state.stage = { fuzz: r.fuzz, rules: r.rules, grid: r.grid, clips: r.clips, aggregate: r.aggregate, defuzz: r.defuzz };
    state.step = 5;
    if (state.selectedRule === null) state.selectedRule = firstActive(r.rules);
  }

  /** Avançar etapa: executa somente a próxima etapa. Retorna false se já terminou. */
  function advance(state, values) {
    if (state.step >= 5) return false;
    const st = state.stage, next = state.step + 1;
    if (next === 1) st.fuzz = I.fuzzify(values.U, values.T);
    else if (next === 2) { st.rules = I.evaluateRules(st.fuzz, values.consequents); if (state.selectedRule === null) state.selectedRule = firstActive(st.rules); }
    else if (next === 3) { st.grid = I.makeGrid(values.dz); st.clips = I.implicate(st.rules, st.grid); }
    else if (next === 4) st.aggregate = I.aggregate(st.clips, st.grid);
    else st.defuzz = I.defuzzify(st.grid, st.aggregate);
    state.step = next;
    return true;
  }

  F.state = { defaultConfig: defaultConfig, createState: createState, invalidate: invalidate,
              restoreDefaults: restoreDefaults, runAll: runAll, advance: advance, firstActive: firstActive };
})(typeof window !== 'undefined' ? window : globalThis);
