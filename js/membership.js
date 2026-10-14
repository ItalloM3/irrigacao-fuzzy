/*
 * Funções de pertinência lineares por partes (a, b, c, d), a ≤ b ≤ c ≤ d,
 * e os conjuntos fixos do enunciado. Sem dependência de DOM.
 */
(function (root) {
  'use strict';
  const F = (root.Fuzzy = root.Fuzzy || {});

  const VARIABLES = {
    umidade: {
      id: 'umidade', label: 'Umidade do solo', symbol: 'U', unit: '%', domain: [0, 100],
      sets: [
        { id: 'seco',          label: 'seco',          params: [0, 0, 20, 50] },
        { id: 'intermediario', label: 'intermediário', params: [20, 50, 50, 80] },
        { id: 'umido',         label: 'úmido',         params: [50, 80, 100, 100] }
      ]
    },
    temperatura: {
      id: 'temperatura', label: 'Temperatura', symbol: 'T', unit: '°C', domain: [10, 40],
      sets: [
        { id: 'baixa', label: 'baixa', params: [10, 10, 15, 25] },
        { id: 'media', label: 'média', params: [15, 25, 25, 35] },
        { id: 'alta',  label: 'alta',  params: [25, 35, 40, 40] }
      ]
    },
    tempo: {
      id: 'tempo', label: 'Tempo de irrigação', symbol: 'z', unit: 'min', domain: [0, 30],
      sets: [
        { id: 'curto', label: 'curto', params: [0, 0, 0, 15] },
        { id: 'medio', label: 'médio', params: [0, 15, 15, 30] },
        { id: 'longo', label: 'longo', params: [15, 30, 30, 30] }
      ]
    }
  };

  function getSet(variableId, setId) {
    const v = VARIABLES[variableId];
    const s = v && v.sets.find(function (x) { return x.id === setId; });
    if (!s) throw new Error('Conjunto inexistente: ' + variableId + '/' + setId);
    return s;
  }

  function checkParams(params) {
    const ok = Array.isArray(params) && params.length === 4 &&
      params.every(Number.isFinite) &&
      params[0] <= params[1] && params[1] <= params[2] && params[2] <= params[3];
    if (!ok) throw new Error('Parâmetros inválidos: exige-se a ≤ b ≤ c ≤ d.');
  }

  /**
   * μ(x) trapezoidal/triangular.
   * O trecho de pertinência 1 é avaliado ANTES das rampas, e cada divisão só ocorre
   * dentro de um intervalo não vazio (a < b na subida; c < d na descida).
   */
  function membership(x, params) {
    if (typeof x !== 'number' || !Number.isFinite(x)) {
      throw new TypeError('x deve ser um número finito.');
    }
    const a = params[0], b = params[1], c = params[2], d = params[3];
    let mu;
    if (x >= b && x <= c) mu = 1;                 // platô (inclui extremos degenerados)
    else if (x < a || x > d) mu = 0;              // fora do suporte
    else if (x < b) mu = (x - a) / (b - a);       // subida: a ≤ x < b  ⇒ b - a > 0
    else mu = (d - x) / (d - c);                  // descida: c < x ≤ d ⇒ d - c > 0
    return mu < 0 ? 0 : mu > 1 ? 1 : mu;
  }

  F.membership = { VARIABLES: VARIABLES, getSet: getSet, checkParams: checkParams, membership: membership };
})(typeof window !== 'undefined' ? window : globalThis);
