/* Formatação numérica pt-BR (somente apresentação; nunca usada nos cálculos). */
(function (root) {
  'use strict';
  const F = (root.Fuzzy = root.Fuzzy || {});

  /** Número com até `dec` casas, sem zeros à direita, vírgula decimal. */
  function num(n, dec) {
    if (dec === undefined) dec = 6;
    if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
    let s = n.toFixed(dec);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s.replace('.', ',');
  }

  /** Número com exatamente `dec` casas, vírgula decimal. */
  function fixed(n, dec) {
    if (dec === undefined) dec = 2;
    if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
    return n.toFixed(dec).replace('.', ',');
  }

  F.format = { num: num, fixed: fixed };
})(typeof window !== 'undefined' ? window : globalThis);
