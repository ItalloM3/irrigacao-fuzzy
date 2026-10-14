/* Validação de entradas. Nunca corrige valores silenciosamente. */
(function (root) {
  'use strict';
  const F = (root.Fuzzy = root.Fuzzy || {});
  const fmt = F.format.num;

  const NUMERIC = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;
  const NON_FINITE = /^[+-]?(infinity|inf|nan)$/i;

  /**
   * Converte o texto digitado em número e confere o intervalo.
   * Retorna { ok, value, error }.
   */
  function parseInRange(raw, spec) {
    const name = spec.label;
    let value;
    if (typeof raw === 'number') {
      if (!Number.isFinite(raw)) return { ok: false, value: null, error: name + ': valor não finito (NaN ou infinito) não é aceito.' };
      value = raw;
    } else {
      const s = (raw === null || raw === undefined) ? '' : String(raw).trim();
      if (s === '') return { ok: false, value: null, error: name + ': campo vazio. Informe um número entre ' + fmt(spec.min) + ' e ' + fmt(spec.max) + ' ' + spec.unit + '.' };
      if (NON_FINITE.test(s)) return { ok: false, value: null, error: name + ': valor não finito (NaN ou infinito) não é aceito.' };
      if (!NUMERIC.test(s)) return { ok: false, value: null, error: name + ': "' + s + '" não é um número. Use apenas dígitos e, se quiser, vírgula ou ponto decimal.' };
      value = Number(s.replace(',', '.'));
      if (!Number.isFinite(value)) return { ok: false, value: null, error: name + ': valor não finito não é aceito.' };
    }
    if (value < spec.min || value > spec.max) {
      return { ok: false, value: null, error: name + ': ' + fmt(value) + ' ' + spec.unit + ' está fora do intervalo permitido (' + fmt(spec.min) + ' a ' + fmt(spec.max) + ' ' + spec.unit + ').' };
    }
    return { ok: true, value: value, error: '' };
  }

  const SPEC_U = { label: 'Umidade do solo', min: 0, max: 100, unit: '%' };
  const SPEC_T = { label: 'Temperatura', min: 10, max: 40, unit: '°C' };

  function validateU(raw) { return parseInRange(raw, SPEC_U); }
  function validateT(raw) { return parseInRange(raw, SPEC_T); }

  function validateStep(raw) {
    const v = Number(String(raw).replace(',', '.'));
    const ok = F.inference.ALLOWED_STEPS.some(function (s) { return Math.abs(s - v) < 1e-12; });
    return ok ? { ok: true, value: v, error: '' }
              : { ok: false, value: null, error: 'Passo Δz: escolha 0,1; 0,05 ou 0,01 minuto.' };
  }

  /** Valida a configuração inteira. Retorna { ok, errors:{U,T,dz,rules[]}, values }. */
  function validateConfig(cfg) {
    const u = validateU(cfg.U), t = validateT(cfg.T), d = validateStep(cfg.dz);
    const ruleErrors = [];
    for (let i = 0; i < 9; i++) {
      const c = cfg.consequents && cfg.consequents[i];
      ruleErrors.push(F.rules.CONSEQUENT_IDS.indexOf(c) >= 0 ? '' : 'Regra R' + (i + 1) + ': selecione curto, médio ou longo.');
    }
    const ok = u.ok && t.ok && d.ok && ruleErrors.every(function (e) { return e === ''; });
    return {
      ok: ok,
      errors: { U: u.error, T: t.error, dz: d.error, rules: ruleErrors },
      values: ok ? { U: u.value, T: t.value, dz: d.value, consequents: cfg.consequents.slice() } : null
    };
  }

  F.validation = { validateU: validateU, validateT: validateT, validateStep: validateStep, validateConfig: validateConfig };
})(typeof window !== 'undefined' ? window : globalThis);
