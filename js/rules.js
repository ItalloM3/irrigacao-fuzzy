/* Base de regras: antecedentes fixos, consequentes configuráveis. */
(function (root) {
  'use strict';
  const F = (root.Fuzzy = root.Fuzzy || {});

  const ANTECEDENTS = [
    ['seco', 'baixa'], ['seco', 'media'], ['seco', 'alta'],
    ['intermediario', 'baixa'], ['intermediario', 'media'], ['intermediario', 'alta'],
    ['umido', 'baixa'], ['umido', 'media'], ['umido', 'alta']
  ];
  const DEFAULT_CONSEQUENTS = ['medio', 'longo', 'longo', 'curto', 'medio', 'longo', 'curto', 'curto', 'curto'];
  const CONSEQUENT_IDS = ['curto', 'medio', 'longo'];

  /** Monta as nove regras com os consequentes informados (todas devem estar preenchidas). */
  function buildRules(consequents) {
    if (!Array.isArray(consequents) || consequents.length !== 9) {
      throw new Error('São necessários exatamente nove consequentes.');
    }
    return ANTECEDENTS.map(function (ant, i) {
      if (CONSEQUENT_IDS.indexOf(consequents[i]) < 0) {
        throw new Error('Consequente inválido na regra R' + (i + 1) + '.');
      }
      return { id: 'R' + (i + 1), index: i, umidade: ant[0], temperatura: ant[1], consequente: consequents[i] };
    });
  }

  F.rules = {
    ANTECEDENTS: ANTECEDENTS,
    DEFAULT_CONSEQUENTS: DEFAULT_CONSEQUENTS,
    CONSEQUENT_IDS: CONSEQUENT_IDS,
    buildRules: buildRules
  };
})(typeof window !== 'undefined' ? window : globalThis);
