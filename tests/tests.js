/*
 * Testes dos casos 6.1–6.5 do enunciado. Sem DOM.
 *   Node:      node tests/tests.js
 *   Navegador: abrir tests/index.html
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports && typeof require === 'function';
  if (isNode) {
    const base = require('path').join(__dirname, '..', 'js');
    ['format', 'membership', 'rules', 'inference', 'validation', 'state'].forEach(function (m) { require(require('path').join(base, m + '.js')); });
  }
  const F = root.Fuzzy;
  const I = F.inference, M = F.membership, V = F.validation, S = F.state;
  const DEF = F.rules.DEFAULT_CONSEQUENTS;

  const TOL_MU = 1e-6;   // pertinências e ativações
  const TOL_T = 0.01;    // tempos de referência (min)
  const results = [];
  function check(group, name, ok, detail) { results.push({ group: group, name: name, ok: !!ok, detail: detail || '' }); }
  function near(a, b, tol) { return typeof a === 'number' && Math.abs(a - b) <= tol; }
  const f6 = function (n) { return n.toFixed(6); };

  function run(U, T, dz, cons) { return I.infer({ U: U, T: T, dz: dz === undefined ? 0.1 : dz, consequents: cons || DEF.slice() }); }
  function degrees(U, T) {
    const f = I.fuzzify(U, T);
    return { u: [f.umidade.seco, f.umidade.intermediario, f.umidade.umido], t: [f.temperatura.baixa, f.temperatura.media, f.temperatura.alta] };
  }
  function tupleOk(got, exp) { return got.length === exp.length && got.every(function (g, i) { return near(g, exp[i], TOL_MU); }); }

  /* ---------- 6.1 Pertinências e extremos ---------- */
  (function () {
    const g = '6.1 Pertinências e extremos';
    let d = degrees(35, 30);
    check(g, 'U=35 → (seco, intermediário, úmido) = (0,5; 0,5; 0)', tupleOk(d.u, [0.5, 0.5, 0]), d.u.map(f6).join(' / '));
    check(g, 'T=30 → (baixa, média, alta) = (0; 0,5; 0,5)', tupleOk(d.t, [0, 0.5, 0.5]), d.t.map(f6).join(' / '));
    [[0, [1, 0, 0]], [100, [0, 0, 1]]].forEach(function (c) {
      d = degrees(c[0], 30);
      check(g, 'U=' + c[0] + ' → (' + c[1].join(', ') + ')', tupleOk(d.u, c[1]), d.u.map(f6).join(' / '));
    });
    [[10, [1, 0, 0]], [40, [0, 0, 1]]].forEach(function (c) {
      d = degrees(35, c[0]);
      check(g, 'T=' + c[0] + ' → (' + c[1].join(', ') + ')', tupleOk(d.t, c[1]), d.t.map(f6).join(' / '));
    });
    // Extremos dos conjuntos de saída e ausência de NaN/Infinity em todo o domínio dos degenerados
    const out = [['curto', 0], ['longo', 30]].every(function (p) { return M.membership(p[1], M.getSet('tempo', p[0]).params) === 1; });
    check(g, 'μcurto(0)=1 e μlongo(30)=1', out);
    let finite = true;
    ['umidade', 'temperatura', 'tempo'].forEach(function (v) {
      const dom = M.VARIABLES[v].domain;
      M.VARIABLES[v].sets.forEach(function (s) {
        for (let x = dom[0]; x <= dom[1] + 1e-9; x += (dom[1] - dom[0]) / 600) {
          const mu = M.membership(x, s.params);
          if (!Number.isFinite(mu) || mu < 0 || mu > 1) finite = false;
        }
      });
    });
    check(g, 'Sem NaN/Infinity e 0 ≤ μ ≤ 1 em todo o domínio (inclui a=b e c=d)', finite);
    check(g, 'Todos os conjuntos satisfazem a ≤ b ≤ c ≤ d', (function () {
      try { Object.keys(M.VARIABLES).forEach(function (v) { M.VARIABLES[v].sets.forEach(function (s) { M.checkParams(s.params); }); }); return true; } catch (e) { return false; }
    })());
  })();

  /* ---------- 6.2 Regra única ---------- */
  (function () {
    const g = '6.2 Ativação de uma única regra';
    [[20, 35, 2, 25, 'longo', 'R3'], [50, 25, 4, 15, 'médio', 'R5'], [80, 25, 7, 5, 'curto', 'R8']].forEach(function (c) {
      const r = run(c[0], c[1]);
      const act = r.rules.filter(function (x) { return x.active; });
      const only = act.length === 1 && act[0].id === c[5] && near(act[0].h, 1, TOL_MU);
      check(g, 'U=' + c[0] + ', T=' + c[1] + ': somente ' + c[5] + ' com h = 1', only, act.map(function (x) { return x.id + ' h=' + f6(x.h); }).join('; '));
      check(g, '… tempo ≈ ' + c[3] + ',00 min (saída agregada = ' + c[4] + ' completo)', near(r.defuzz.centroid, c[3], TOL_T), f6(r.defuzz.centroid) + ' min');
    });
  })();

  /* ---------- 6.3 Inferência completa ---------- */
  (function () {
    const g = '6.3 Inferência completa com sobreposição';
    const r = run(35, 30, 0.1);
    const d = degrees(35, 30);
    check(g, 'Fuzzificação (0,5; 0,5; 0 | 0; 0,5; 0,5)', tupleOk(d.u.concat(d.t), [0.5, 0.5, 0, 0, 0.5, 0.5]));
    const exp = { R2: 'longo', R3: 'longo', R5: 'medio', R6: 'longo' };
    const act = r.rules.filter(function (x) { return x.active; });
    check(g, 'Regras ativadas: R2, R3, R5, R6 com h = 0,5 e consequentes longo, longo, médio, longo',
      act.length === 4 && act.every(function (x) { return exp[x.id] === x.consequente && near(x.h, 0.5, TOL_MU); }),
      act.map(function (x) { return x.id + '→' + x.consequente + ' h=' + f6(x.h); }).join('; '));
    check(g, 'Demais regras com ativação 0', r.rules.filter(function (x) { return !x.active; }).every(function (x) { return x.h === 0; }));
    const pts = [[0, 0], [3, 0.2], [7.5, 0.5], [15, 0.5], [30, 0.5]];
    const got = pts.map(function (p) { return I.aggregateAt(r.rules, p[0]); });
    check(g, 'μ agregada em z = 0; 3; 7,5; 15; 30 → 0; 0,2; 0,5; 0,5; 0,5', pts.every(function (p, i) { return near(got[i], p[1], TOL_MU); }), got.map(f6).join(' / '));
    let maxAgg = 0; for (let k = 0; k < r.grid.N; k++) if (r.aggregate[k] > maxAgg) maxAgg = r.aggregate[k];
    check(g, 'Três regras → longo não elevam a altura acima de 0,5 (máximo, não soma)', near(maxAgg, 0.5, TOL_MU), 'máx μ agregada = ' + f6(maxAgg));
    check(g, 'Centroide numérico (Δz=0,1) ≈ 16,785683; exibição 16,79', near(r.defuzz.centroid, 16.785683, 1e-6) && r.defuzz.centroid.toFixed(2) === '16.79', f6(r.defuzz.centroid) + ' min');
  })();

  /* ---------- 6.4 Simetria, regras e precisão ---------- */
  (function () {
    const g = '6.4 Simetria, alteração de regras e precisão';
    const r = run(35, 20, 0.1);
    const ids = r.rules.filter(function (x) { return x.active; }).map(function (x) { return x.id; }).join(',');
    check(g, 'U=35, T=20: R1, R2, R4, R5 com h = 0,5', ids === 'R1,R2,R4,R5' && r.rules.filter(function (x) { return x.active; }).every(function (x) { return near(x.h, 0.5, TOL_MU); }), ids);
    let constant = true; for (let k = 0; k < r.grid.N; k++) if (!near(r.aggregate[k], 0.5, TOL_MU)) constant = false;
    check(g, 'Agregação constante em 0,5 em todo o intervalo 0–30', constant);
    check(g, 'Tempo = 15,00 min', near(r.defuzz.centroid, 15, TOL_T), f6(r.defuzz.centroid) + ' min');

    const allShort = run(50, 25, 0.1, ['curto', 'curto', 'curto', 'curto', 'curto', 'curto', 'curto', 'curto', 'curto']);
    check(g, 'Todas as regras → curto, U=50, T=25: ≈ 5,00 min', near(allShort.defuzz.centroid, 5, TOL_T), f6(allShort.defuzz.centroid) + ' min');

    const st = S.createState();
    st.config.consequents = ['curto', 'curto', 'curto', 'curto', 'curto', 'curto', 'curto', 'curto', 'curto'];
    st.config.U = '50'; st.config.T = '25'; st.config.dz = '0.01';
    S.runAll(st, V.validateConfig(st.config).values);
    S.restoreDefaults(st);
    const c = st.config;
    check(g, 'Restaurar padrão: U=35, T=30, Δz=0,1, regras padrão e resultados limpos',
      c.U === '35' && c.T === '30' && c.dz === '0.1' && c.consequents.join() === DEF.join() && st.step === 0 && Object.keys(st.stage).length === 0);
    S.runAll(st, V.validateConfig(st.config).values);
    check(g, 'Após restaurar e calcular: 16,79 min', st.stage.defuzz.centroid.toFixed(2) === '16.79', f6(st.stage.defuzz.centroid) + ' min');

    const REF = 16.785714;
    [[0.1, 16.785683], [0.05, 16.785706], [0.01, 16.785714]].forEach(function (p) {
      const v = run(35, 30, p[0]).defuzz.centroid;
      check(g, 'Δz = ' + p[0] + ' → ≈ ' + p[1].toFixed(6) + ' (N = ' + Math.round(30 / p[0]) + ')', near(v, p[1], 2e-6), f6(v) + ' min; erro vs. contínuo (16,785714) = ' + Math.abs(v - REF).toExponential(2));
    });
    const e1 = Math.abs(run(35, 30, 0.1).defuzz.centroid - 16.785714285714);
    const e2 = Math.abs(run(35, 30, 0.05).defuzz.centroid - 16.785714285714);
    const e3 = Math.abs(run(35, 30, 0.01).defuzz.centroid - 16.785714285714);
    check(g, 'Passos menores aproximam melhor o centroide contínuo (erro decresce)', e1 > e2 && e2 > e3, e1.toExponential(2) + ' > ' + e2.toExponential(2) + ' > ' + e3.toExponential(2));
  })();

  /* ---------- 6.5 Interface (validação) e determinismo ---------- */
  (function () {
    const g = '6.5 Validação e determinismo';
    [['-1', 'U'], ['101', 'U'], ['', 'U'], ['   ', 'U'], ['abc', 'U'], ['Infinity', 'U'], ['NaN', 'U'], ['1e', 'U'], ['--5', 'U'],
     ['9', 'T'], ['41', 'T'], ['', 'T'], ['xyz', 'T'], ['-Infinity', 'T'], ['NaN', 'T']].forEach(function (c) {
      const r = c[1] === 'U' ? V.validateU(c[0]) : V.validateT(c[0]);
      check(g, c[1] + ' = "' + c[0] + '" é bloqueado com mensagem', !r.ok && r.error.length > 10, r.error);
    });
    check(g, 'U = NaN e U = Infinity (tipo number) são bloqueados', !V.validateU(NaN).ok && !V.validateU(Infinity).ok);
    ['0', '100', '35', '35,5', '35.5'].forEach(function (s) { check(g, 'U = "' + s + '" é aceito', V.validateU(s).ok); });
    ['10', '40', '30'].forEach(function (s) { check(g, 'T = "' + s + '" é aceito', V.validateT(s).ok); });
    check(g, 'Valores inválidos não são corrigidos: value = null', V.validateU('101').value === null && V.validateT('9').value === null);
    const bad = V.validateConfig({ U: '101', T: '30', dz: '0.1', consequents: DEF.slice() });
    check(g, 'validateConfig com U=101 → ok = false e values = null', !bad.ok && bad.values === null);
    check(g, 'Δz inválido (0,2) e consequente inválido são bloqueados',
      !V.validateStep('0.2').ok && !V.validateConfig({ U: '35', T: '30', dz: '0.1', consequents: DEF.slice(0, 8).concat(['x']) }).ok);

    const vals = V.validateConfig({ U: '35', T: '30', dz: '0.1', consequents: DEF.slice() }).values;
    const a = I.infer(vals), b = I.infer(vals);
    const same = a.defuzz.centroid === b.defuzz.centroid &&
      a.rules.every(function (r, i) { return r.h === b.rules[i].h; }) &&
      a.aggregate.every(function (v, i) { return v === b.aggregate[i]; });
    check(g, 'Repetir a configuração reproduz graus, ativações, área agregada e tempo (idênticos)', same, f6(a.defuzz.centroid) + ' min');

    const sa = S.createState(); S.runAll(sa, vals);
    const sb = S.createState(); let n = 0; while (S.advance(sb, vals)) n++;
    const equal = sa.stage.defuzz.centroid === sb.stage.defuzz.centroid &&
      sa.stage.aggregate.every(function (v, i) { return v === sb.stage.aggregate[i]; }) &&
      sa.stage.rules.every(function (r, i) { return r.h === sb.stage.rules[i].h; });
    check(g, 'Calcular direto = percorrer 5 etapas (saída idêntica)', equal && n === 5 && sb.step === 5, n + ' avanços; ' + f6(sb.stage.defuzz.centroid) + ' min');
    check(g, 'Após a última etapa, Avançar não executa etapa inexistente', S.advance(sb, vals) === false && sb.step === 5);

    const den = I.defuzzify({ N: 3, z: Float64Array.from([0.5, 1.5, 2.5]) }, new Float64Array(3));
    check(g, 'Denominador zero → saída inválida (sem 0, NaN ou Infinity)', den.valid === false && den.centroid === null && den.message.length > 0);
  })();

  /* ---------- Wizard (uma etapa por vez) ---------- */
  (function () {
    const g = 'Navegação por etapas';
    const vals = V.validateConfig({ U: '35', T: '30', dz: '0.1', consequents: DEF.slice() }).values;
    const st = S.createState();
    check(g, 'Início: nenhuma etapa calculada nem exibida', st.step === 0 && st.view === 0);
    check(g, 'Aba de etapa não calculada não pode ser aberta', S.setView(st, 1) === false && st.view === 0);
    S.next(st, vals);
    check(g, 'Avançar calcula e exibe a etapa 1', st.step === 1 && st.view === 1);
    S.next(st, vals); S.next(st, vals);
    check(g, 'Etapas 2 e 3 calculadas na ordem', st.step === 3 && st.view === 3);
    check(g, 'Aba anterior é aberta sem recalcular', S.setView(st, 1) === true && st.view === 1 && st.step === 3);
    S.next(st, vals);
    check(g, 'Avançar após voltar apenas exibe a próxima etapa já calculada', st.view === 2 && st.step === 3);
    check(g, 'Não é possível abrir etapa além da última calculada', S.setView(st, 4) === false && S.setView(st, 6) === false && S.setView(st, 0) === false);
    S.next(st, vals); S.next(st, vals); S.next(st, vals);
    check(g, 'Chega à etapa 5 e para (nada além)', st.step === 5 && st.view === 5 && S.next(st, vals) === false);
    S.setView(st, 2); S.next(st, vals); S.next(st, vals); S.next(st, vals);
    check(g, 'Voltar e avançar de novo termina na etapa 5 com o mesmo tempo', st.view === 5 && st.stage.defuzz.centroid.toFixed(2) === '16.79');
    S.invalidate(st);
    check(g, 'Alterar configuração reinicia etapas e exibição', st.step === 0 && st.view === 0);
    S.runAll(st, vals);
    check(g, 'Calcular completa as 5 etapas e exibe a 5', st.step === 5 && st.view === 5);
  })();

  /* ---------- Saída ---------- */
  const failed = results.filter(function (r) { return !r.ok; });
  root.FuzzyTestResults = results;
  if (isNode) {
    let group = '';
    results.forEach(function (r) {
      if (r.group !== group) { group = r.group; console.log('\n' + group); }
      console.log('  ' + (r.ok ? '[OK]   ' : '[FALHA]') + ' ' + r.name + (r.detail ? '  →  ' + r.detail : ''));
    });
    console.log('\n' + (results.length - failed.length) + '/' + results.length + ' verificações passaram.');
    process.exitCode = failed.length ? 1 : 0;
  }
})(typeof window !== 'undefined' ? window : globalThis);
