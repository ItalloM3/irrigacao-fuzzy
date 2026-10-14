/* Liga controles ↔ estado ↔ apresentação. */
(function () {
  'use strict';
  const F = window.Fuzzy, S = F.state, VAL = F.validation, P = F.presentation;
  const $ = function (id) { return document.getElementById(id); };
  const state = S.createState();
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function buildRulesEditor() {
    const ant = F.rules.ANTECEDENTS;
    $('rules-editor').innerHTML = ant.map(function (a, i) {
      return '<div class="rrow"><label for="cons-' + i + '"><b>R' + (i + 1) + '</b> ' + P.LABEL[a[0]] + ' E ' + P.LABEL[a[1]] + ' →</label>' +
        '<select id="cons-' + i + '" data-i="' + i + '" aria-label="Consequente da regra R' + (i + 1) + '">' +
        F.rules.CONSEQUENT_IDS.map(function (c) { return '<option value="' + c + '">' + P.LABEL[c] + '</option>'; }).join('') + '</select></div>';
    }).join('');
  }

  function writeControls() {
    const c = state.config;
    $('in-U').value = c.U; $('in-T').value = c.T; $('dz').value = c.dz;
    const u = VAL.validateU(c.U), t = VAL.validateT(c.T);
    if (u.ok) $('sl-U').value = u.value;
    if (t.ok) $('sl-T').value = t.value;
    c.consequents.forEach(function (v, i) { $('cons-' + i).value = v; });
  }

  /** Valida e mostra erros; retorna os valores numéricos ou null. */
  function check() {
    const v = VAL.validateConfig(state.config);
    [['U', 'in-U', 'err-U'], ['T', 'in-T', 'err-T']].forEach(function (f) {
      $(f[2]).textContent = v.errors[f[0]];
      $(f[1]).setAttribute('aria-invalid', v.errors[f[0]] ? 'true' : 'false');
    });
    state.blocked = !v.ok;
    return v.ok ? v.values : null;
  }

  function status(msg, kind) { const s = $('status'); s.textContent = msg; s.className = 'status' + (kind ? ' ' + kind : ''); }

  /** Alteração de configuração: descarta resultados e reinicia a sequência. */
  function changed() {
    const had = S.invalidate(state);
    const ok = check();
    if (!ok) status('Corrija os campos destacados para calcular.', 'warn');
    else if (had) status('Configuração alterada: os resultados anteriores foram descartados. Use Calcular ou Avançar etapa.', 'warn');
    else status('Pronto. Use Calcular ou Avançar etapa.');
    P.render(state);
  }

  function scrollTo(id) {
    const el = $(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function bind() {
    $('in-U').addEventListener('input', function (e) { state.config.U = e.target.value; const r = VAL.validateU(e.target.value); if (r.ok) $('sl-U').value = r.value; changed(); });
    $('in-T').addEventListener('input', function (e) { state.config.T = e.target.value; const r = VAL.validateT(e.target.value); if (r.ok) $('sl-T').value = r.value; changed(); });
    $('sl-U').addEventListener('input', function (e) { state.config.U = e.target.value; $('in-U').value = e.target.value; changed(); });
    $('sl-T').addEventListener('input', function (e) { state.config.T = e.target.value; $('in-T').value = e.target.value; changed(); });
    $('dz').addEventListener('change', function (e) { state.config.dz = e.target.value; changed(); });
    $('rules-editor').addEventListener('change', function (e) {
      if (e.target.dataset.i === undefined) return;
      state.config.consequents[Number(e.target.dataset.i)] = e.target.value; changed();
    });

    $('btn-calc').addEventListener('click', function () {
      const v = check(); if (!v) { P.render(state); status('Corrija os campos destacados para calcular.', 'warn'); return; }
      S.runAll(state, v); P.render(state);
      status('Cálculo completo: as cinco etapas foram executadas.', 'ok'); scrollTo('step-5');
    });
    $('btn-next').addEventListener('click', function () {
      const v = check(); if (!v) { P.render(state); status('Corrija os campos destacados para continuar.', 'warn'); return; }
      if (!S.advance(state, v)) return;
      P.render(state);
      status('Etapa ' + state.step + ' de 5 concluída: ' + P.STEP_NAMES[state.step - 1] + '.', 'ok'); scrollTo('step-' + state.step);
    });
    $('btn-reset').addEventListener('click', function () {
      S.restoreDefaults(state); writeControls(); check(); P.render(state);
      status('Padrões restaurados: U = 35 %, T = 30 °C, base de regras padrão e Δz = 0,1 min. Resultados limpos.');
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    function pick(e) {
      const b = e.target.closest('[data-rule]'); if (!b) return;
      state.selectedRule = Number(b.dataset.rule); P.render(state);
      const again = document.querySelector('#rules-body [data-rule="' + state.selectedRule + '"]');
      if (e.currentTarget.id === 'rules-body' && again) again.focus();
    }
    $('rules-body').addEventListener('click', pick);
    $('gallery').addEventListener('click', pick);
    $('sel-rule').addEventListener('change', function (e) { state.selectedRule = Number(e.target.value); P.render(state); });
  }

  buildRulesEditor(); P.fixedSets(); writeControls(); bind(); check(); P.render(state);
  status('Pronto. Use Calcular ou Avançar etapa.');
})();
