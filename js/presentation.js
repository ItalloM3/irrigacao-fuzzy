/* Renderização de textos, tabelas, logs e gráficos a partir do estado. Não calcula nada. */
(function (root) {
  'use strict';
  const F = (root.Fuzzy = root.Fuzzy || {});
  const M = F.membership, V = F.visualization;
  const n = F.format.num, fx = F.format.fixed;
  const L = V.LABEL;

  const STEP_NAMES = ['Fuzzificação', 'Avaliação das regras', 'Implicação', 'Agregação', 'Defuzzificação'];
  const $ = function (id) { return document.getElementById(id); };
  const sw = function (id) { return '<span class="sw" style="background:var(--c-' + id + ')"></span>'; };
  const ruleText = function (r) { return r.id + ': SE o solo é ' + L[r.umidade] + ' E a temperatura é ' + L[r.temperatura] + ', ENTÃO o tempo é ' + L[r.consequente]; };
  const logHtml = function (lines) { return lines.map(function (l) { return '<li>' + l + '</li>'; }).join(''); };

  function degreesTable(varId, value, degrees) {
    const v = M.VARIABLES[varId];
    let h = '<table class="degrees"><caption>Graus de pertinência para ' + v.symbol + ' = ' + n(value) + ' ' + v.unit + '</caption>' +
      '<thead><tr><th scope="col">Conjunto</th><th scope="col" class="num">μ(' + v.symbol + ')</th></tr></thead><tbody>';
    v.sets.forEach(function (s) {
      h += '<tr class="' + (degrees[s.id] > 0 ? 'on' : 'off') + '"><th scope="row">' + sw(s.id) + s.label + '</th><td class="num">' + n(degrees[s.id]) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  /* ---------- Etapa 1 ---------- */
  function stage1(st) {
    const f = st.stage.fuzz;
    $('chart-umidade').innerHTML = V.membershipChart('umidade', f.U, f.umidade);
    $('chart-temperatura').innerHTML = V.membershipChart('temperatura', f.T, f.temperatura);
    $('deg-umidade').innerHTML = degreesTable('umidade', f.U, f.umidade);
    $('deg-temperatura').innerHTML = degreesTable('temperatura', f.T, f.temperatura);
    const line = function (v, d) { return v.symbol + ' = ' + n(d.v) + ' ' + v.unit + ' → ' + v.sets.map(function (s) { return s.label + ' = ' + n(d.g[s.id]); }).join('; ') + '.'; };
    $('log-1').innerHTML = logHtml([
      line(M.VARIABLES.umidade, { v: f.U, g: f.umidade }),
      line(M.VARIABLES.temperatura, { v: f.T, g: f.temperatura }),
      'Os graus indicam compatibilidade com cada termo linguístico; não são probabilidades e não precisam somar 1.'
    ]);
  }

  /* ---------- Etapa 2 ---------- */
  function stage2(st) {
    let h = '';
    st.stage.rules.forEach(function (r, i) {
      const sel = st.selectedRule === i;
      h += '<tr class="' + (r.active ? 'is-active' : 'is-off') + (sel ? ' is-selected' : '') + '">' +
        '<th scope="row"><button type="button" class="rule-pick" data-rule="' + i + '" aria-pressed="' + sel + '" title="Inspecionar o recorte desta regra (etapa 3)">' + r.id + '</button></th>' +
        '<td>' + sw(r.umidade) + L[r.umidade] + '</td><td>' + sw(r.temperatura) + L[r.temperatura] + '</td>' +
        '<td class="num">' + n(r.muU) + '</td><td class="num">' + n(r.muT) + '</td>' +
        '<td class="num hcell">min(' + n(r.muU) + '; ' + n(r.muT) + ') = <b>' + n(r.h) + '</b></td>' +
        '<td>' + sw(r.consequente) + L[r.consequente] + '</td>' +
        '<td><span class="badge ' + (r.active ? 'badge-on' : 'badge-off') + '">' + (r.active ? 'ativada' : 'h = 0') + '</span></td></tr>';
    });
    $('rules-body').innerHTML = h;
    const act = st.stage.rules.filter(function (r) { return r.active; });
    const lines = st.stage.rules.map(function (r) {
      return r.id + ': min(' + n(r.muU) + '; ' + n(r.muT) + ') = ' + n(r.h) + (r.active ? ' → ativada.' : ' → h = 0, não contribui para a saída.');
    });
    lines.push('Operador E = mínimo. ' + act.length + ' de 9 regras ativadas: ' + act.map(function (r) { return r.id; }).join(', ') + '.');
    $('log-2').innerHTML = logHtml(lines);
  }

  /* ---------- Etapa 3 ---------- */
  function stage3(st) {
    const rules = st.stage.rules, i = st.selectedRule === null ? 0 : st.selectedRule, r = rules[i];
    $('sel-rule').innerHTML = rules.map(function (x, k) {
      return '<option value="' + k + '"' + (k === i ? ' selected' : '') + '>' + x.id + ' — ' + L[x.umidade] + ' E ' + L[x.temperatura] + ' → ' + L[x.consequente] + ' (h = ' + n(x.h) + ')</option>';
    }).join('');
    $('chart-rule').innerHTML = V.consequentChart(r, false);
    $('rule-caption').textContent = ruleText(r) + '. ' + (r.active
      ? 'Recorte: μ_r(z) = min(' + n(r.h) + ', μ_' + L[r.consequente] + '(z)).'
      : 'Ativação zero: esta regra não contribui para a saída.');
    const act = rules.filter(function (x) { return x.active; });
    $('gallery').innerHTML = act.map(function (x) {
      return '<button type="button" class="mini' + (x.index === i ? ' is-selected' : '') + '" data-rule="' + x.index + '" aria-pressed="' + (x.index === i) + '">' +
        V.consequentChart(x, true) + '<span>' + x.id + ' → ' + L[x.consequente] + ', h = ' + n(x.h) + '</span></button>';
    }).join('');
    const lines = act.map(function (x) {
      return x.id + ': min(' + n(x.muU) + '; ' + n(x.muT) + ') = ' + n(x.h) + '; consequente ' + L[x.consequente] + ' recortado em ' + n(x.h) + '.';
    });
    const off = rules.filter(function (x) { return !x.active; }).map(function (x) { return x.id; });
    if (off.length) lines.push(off.join(', ') + ': h = 0 → sem recorte e sem contribuição.');
    $('log-3').innerHTML = logHtml(lines);
  }

  /* ---------- Etapa 4 ---------- */
  function stage4(st) {
    const rules = st.stage.rules, g = st.stage.grid, agg = st.stage.aggregate;
    $('chart-agg').innerHTML = V.outputChart(rules, null);
    const groups = {};
    rules.forEach(function (r) { if (r.active) (groups[r.consequente] = groups[r.consequente] || []).push(r); });
    const lines = [], keys = Object.keys(groups);
    keys.forEach(function (c) {
      const hs = groups[c], mx = Math.max.apply(null, hs.map(function (r) { return r.h; }));
      lines.push(L[c] + ': ' + hs.map(function (r) { return r.id + ' (h = ' + n(r.h) + ')'; }).join(', ') +
        (hs.length > 1 ? ' → máximo, não soma: altura efetiva ' + n(mx) + '.' : ' → altura ' + n(mx) + '.'));
    });
    let mx = 0, pos = 0;
    for (let k = 0; k < g.N; k++) { if (agg[k] > 0) pos++; if (agg[k] > mx) mx = agg[k]; }
    lines.push('μ_agregada(z) = max(μ_1(z), …, μ_9(z)) avaliada nos N = ' + g.N + ' pontos z(k) = (k + 0,5) · ' + n(g.dz) + '.');
    lines.push('Pontos com μ_agregada > 0: ' + pos + ' de ' + g.N + '; maior valor agregado = ' + n(mx) + '.');
    $('log-4').innerHTML = logHtml(lines);
  }

  /* ---------- Etapa 5 ---------- */
  function stage5(st) {
    const d = st.stage.defuzz, g = st.stage.grid, rules = st.stage.rules;
    $('chart-out').innerHTML = V.outputChart(rules, d.valid ? d.centroid : null);
    if (!d.valid) {
      $('calc-out').innerHTML = '<p class="error-block" role="alert">' + d.message + '</p>';
      $('log-5').innerHTML = logHtml([d.message + ' Nenhum valor foi retornado como recomendação.']);
      return;
    }
    $('calc-out').innerHTML =
      '<table class="calc"><tbody>' +
      '<tr><th scope="row">Método</th><td>pontos médios, N = ' + g.N + ', Δz = ' + n(g.dz) + ' min</td></tr>' +
      '<tr><th scope="row">Σ z(k) · μ(z(k))</th><td class="num">' + n(d.numerator, 6) + '</td></tr>' +
      '<tr><th scope="row">Σ μ(z(k))</th><td class="num">' + n(d.denominator, 6) + '</td></tr>' +
      '<tr><th scope="row">z* = Σ z·μ / Σ μ</th><td class="num">' + n(d.centroid, 6) + ' min</td></tr></tbody></table>';
    $('log-5').innerHTML = logHtml([
      'Centroide da saída agregada: z* = Σ[z(k) · μ(z(k))] / Σ[μ(z(k))] = ' + n(d.numerator) + ' / ' + n(d.denominator) + ' = ' + n(d.centroid) + ' min.',
      'Δz multiplica numerador e denominador, então se cancela no quociente; ele só define a resolução da grade.',
      'Tempo recomendado: ' + fx(d.centroid, 2) + ' min (precisão interna mantida; arredondamento só na exibição).'
    ]);
  }

  /* ---------- Abas das etapas, resultado ---------- */
  function pipeline(st) {
    $('pipeline').innerHTML = STEP_NAMES.map(function (name, i) {
      const k = i + 1, reached = st.step >= k, cur = st.view === k;
      const cls = cur ? 'current' : (reached ? 'done' : (st.step + 1 === k ? 'next' : 'todo'));
      return '<li role="presentation" class="' + cls + '"><button type="button" role="tab" class="tab" id="tab-' + k + '" aria-controls="step-' + k + '"' +
        ' aria-selected="' + cur + '" tabindex="' + (cur ? 0 : -1) + '"' + (reached ? '' : ' disabled') +
        (reached || st.step + 1 !== k ? '' : ' title="Use Avançar etapa para calcular esta etapa"') + '>' +
        '<span class="node" aria-hidden="true">' + (reached && !cur ? '✓' : k) + '</span><span class="pname">' + name + '</span></button></li>';
    }).join('');
  }

  function result(st) {
    const box = $('result-box');
    const head = '<span class="rl">Tempo recomendado</span>';
    if (st.step < 5) {
      box.className = 'result idle';
      box.innerHTML = head + '<span class="rv">—</span><span class="rs">Disponível ao concluir a etapa 5 (defuzzificação). Use Calcular ou avance etapa por etapa.</span>';
      return;
    }
    const d = st.stage.defuzz, f = st.stage.fuzz, g = st.stage.grid;
    if (!d.valid) { box.className = 'result bad'; box.innerHTML = head + '<span class="rv">—</span><span class="rm">' + d.message + '</span>'; return; }
    box.className = 'result';
    box.innerHTML = head + '<span class="rv">' + fx(d.centroid, 2) + ' <small>min</small></span>' +
      '<span class="rs">Centroide z* = ' + n(d.centroid, 6) + ' min<br>para U = ' + n(f.U) + ' %, T = ' + n(f.T) + ' °C, Δz = ' + n(g.dz) + ' min</span>';
  }

  function ruleNav(st) {
    const el = $('rule-nav');
    if (st.step < 2) { el.innerHTML = ''; return; }
    const r = st.stage.rules[st.selectedRule === null ? 0 : st.selectedRule];
    el.innerHTML = 'Regra selecionada: <b>' + r.id + '</b>. ' +
      (st.step >= 3 ? '<button type="button" data-goto="3">Ver recorte na etapa 3</button>' : 'O recorte aparece ao avançar para a etapa 3.');
  }

  function fixedSets() {
    let h = '<table class="sets"><thead><tr><th scope="col">Variável</th><th scope="col">Conjunto</th><th scope="col" class="num">(a, b, c, d)</th></tr></thead><tbody>';
    Object.keys(M.VARIABLES).forEach(function (k) {
      const v = M.VARIABLES[k];
      v.sets.forEach(function (s, i) {
        h += '<tr><th scope="row">' + (i === 0 ? v.label + ' (' + v.unit + ')' : '') + '</th><td>' + sw(s.id) + s.label + '</td><td class="num">(' + s.params.map(function (p) { return n(p); }).join(', ') + ')</td></tr>';
      });
    });
    $('fixed-sets').innerHTML = h + '</tbody></table>';
  }

  /** Redesenha tudo que depende do estado. Só a etapa em exibição fica visível. */
  function render(st) {
    pipeline(st); result(st);
    for (let k = 1; k <= 5; k++) $('step-' + k).hidden = !(st.view === k && st.step >= k);
    $('empty').hidden = st.step > 0;
    if (st.step >= 1) stage1(st);
    if (st.step >= 2) { stage2(st); ruleNav(st); }
    if (st.step >= 3) stage3(st);
    if (st.step >= 4) stage4(st);
    if (st.step >= 5) stage5(st);
    $('btn-next').disabled = st.view >= 5 || !!st.blocked;
    $('btn-calc').disabled = !!st.blocked;
    $('next-hint').textContent = st.view >= 5 ? 'Sequência concluída: as cinco etapas foram executadas.' : 'Próxima etapa: ' + (st.view + 1) + ' · ' + STEP_NAMES[st.view] + '.';
  }

  F.presentation = { render: render, fixedSets: fixedSets, STEP_NAMES: STEP_NAMES, LABEL: L };
})(typeof window !== 'undefined' ? window : globalThis);
