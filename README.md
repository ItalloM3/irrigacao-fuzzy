# Irrigação fuzzy — simulador Mamdani

Atividade Prática sobre Sistemas Fuzzy — Inteligência Artificial, UFPI, período 2026.2.

- **Autores:** [PREENCHER: nomes dos autores, até três]
- **Aplicação publicada (GitHub Pages):** https://ItalloM3.github.io/irrigacao-fuzzy/
- **Repositório público:** https://github.com/ItalloM3/irrigacao-fuzzy

## 1. Problema e modelo

O simulador recomenda o tempo de irrigação **z** (0 a 30 min) de um jardim a partir da umidade do solo **U** (0 a 100 %) e da temperatura **T** (10 a 40 °C), usando um sistema fuzzy **Mamdani** implementado manualmente em JavaScript. Não há simulação da água no solo, sensores nem controle de equipamentos. As cinco etapas são executadas e exibidas:

1. **Fuzzificação:** seis graus de pertinência (três de U, três de T), inclusive os iguais a zero.
2. **Avaliação das regras:** `h(r) = min(μumidade(U), μtemperatura(T))` (E = mínimo).
3. **Implicação:** `μr(z) = min(h(r), μconsequente(z))` (recorte). Regras com h = 0 não contribuem.
4. **Agregação:** `μagregada(z) = max(μ1(z), …, μ9(z))` (máximo ponto a ponto; nunca soma).
5. **Defuzzificação:** centroide numérico por pontos médios: `N = 30/Δz`, `z(k) = (k + 0,5)·Δz`, `z* = Σ z(k)·μagregada(z(k)) / Σ μagregada(z(k))`. Se o denominador for zero, a saída é declarada inválida (nunca 0 nem NaN).

Os graus de pertinência são graus de compatibilidade com termos linguísticos, não probabilidades, e não precisam somar 1. O tempo calculado vem de regras e conjuntos definidos à mão, não de aprendizado.

## 2. Como usar

Abra `index.html` no navegador (não precisa de servidor, login ou instalação) ou acesse o link do GitHub Pages.

- **Umidade / Temperatura:** campo numérico e controle deslizante sincronizados. Aceita vírgula ou ponto decimal. Valores vazios, não numéricos, `NaN`, `Infinity` ou fora do intervalo **bloqueiam** os botões e mostram uma mensagem; nada é corrigido automaticamente.
- **Consequente de cada regra:** nove seletores (curto, médio, longo). Os antecedentes são fixos.
- **Passo Δz:** 0,1 / 0,05 / 0,01 min.
- **Calcular:** executa as cinco etapas de uma vez.
- **Avançar etapa:** revela uma etapa por vez, na ordem; ao fim, informa que a sequência terminou.
- **Restaurar padrão:** U = 35, T = 30, regras da seção 4, Δz = 0,1 e resultados limpos.
- Qualquer alteração de configuração **descarta os resultados** e reinicia a sequência (aviso na tela).
- Na etapa 2, clique no nome de uma regra para inspecionar, na etapa 3, o consequente original e o recorte; a regra refletirá consequentes editados.

Cada etapa traz gráficos, números e um **registro** com os cálculos reais.

## 3. Conjuntos fixos (a, b, c, d)

| Variável | Conjunto | (a, b, c, d) |
|---|---|---|
| Umidade (%) | seco | (0, 0, 20, 50) |
| | intermediário | (20, 50, 50, 80) |
| | úmido | (50, 80, 100, 100) |
| Temperatura (°C) | baixa | (10, 10, 15, 25) |
| | média | (15, 25, 25, 35) |
| | alta | (25, 35, 40, 40) |
| Tempo (min) | curto | (0, 0, 0, 15) |
| | médio | (0, 15, 15, 30) |
| | longo | (15, 30, 30, 30) |

Função de pertinência: `1` se b ≤ x ≤ c (avaliado primeiro, o que trata os extremos); `0` se x < a ou x > d; `(x−a)/(b−a)` se a ≤ x < b; `(d−x)/(d−c)` se c < x ≤ d. As divisões só ocorrem em rampas não vazias, então `a = b` e `c = d` nunca dividem por zero.

## 4. Base de regras padrão

| Regra | Umidade | Temperatura | Então o tempo é |
|---|---|---|---|
| R1 | seco | baixa | médio |
| R2 | seco | média | longo |
| R3 | seco | alta | longo |
| R4 | intermediário | baixa | curto |
| R5 | intermediário | média | médio |
| R6 | intermediário | alta | longo |
| R7 | úmido | baixa | curto |
| R8 | úmido | média | curto |
| R9 | úmido | alta | curto |

## 5. Bibliotecas

**Nenhuma biblioteca externa.** HTML, CSS e JavaScript puros; os gráficos são SVG gerados pelo próprio código (`js/visualization.js`). Nenhuma biblioteca de lógica fuzzy ou IA foi usada.

## 6. Estrutura

```
index.html            página
css/styles.css        estilos
js/format.js          formatação pt-BR (só apresentação)
js/membership.js      função de pertinência e conjuntos fixos
js/rules.js           regras e consequentes configuráveis
js/inference.js       fuzzificação, mínimo, implicação, máximo, centroide
js/validation.js      validação de entradas
js/state.js           estado, Calcular, Avançar, Restaurar (sem DOM)
js/visualization.js   gráficos SVG
js/presentation.js    tabelas, logs, resultado
js/main.js            eventos
tests/tests.js        testes 6.1–6.5 (Node ou navegador)
tests/index.html      executa os testes no navegador
```

A matemática (`membership`, `rules`, `inference`, `validation`, `state`) não depende do DOM; a visualização só desenha. Calcular e Avançar etapa usam as mesmas funções, então produzem a mesma saída.

## 7. Resultados dos testes

Comando: `node tests/tests.js` (ou abrir `tests/index.html`). Resultado da execução: **62/62 verificações passaram**. Salvo indicação, base padrão e Δz = 0,1. Tolerâncias: 1e-6 (pertinências e ativações) e 0,01 min (tempos). O fluxo da interface (Calcular, Avançar, Restaurar, validação, alteração de regras, Δz, celular) também foi conferido em Chromium com Playwright: 40/40 verificações.

### 6.1 Pertinências e extremos
| Entrada | Obtido (ordem dos conjuntos) | Conclusão |
|---|---|---|
| U = 35 | seco 0,5; intermediário 0,5; úmido 0 | conforme |
| T = 30 | baixa 0; média 0,5; alta 0,5 | conforme |
| U = 0 / U = 100 | (1, 0, 0) / (0, 0, 1) | conforme |
| T = 10 / T = 40 | (1, 0, 0) / (0, 0, 1) | conforme |

Também: μcurto(0) = 1, μlongo(30) = 1; varredura de todo o domínio de todos os conjuntos sem NaN, sem Infinity e com 0 ≤ μ ≤ 1. **Conclusão:** extremos degenerados tratados sem divisão por zero.

### 6.2 Ativação de uma única regra
| Entrada | Regra ativa (h) | Saída agregada | Tempo obtido | Esperado |
|---|---|---|---|---|
| U = 20, T = 35 | R3 (1) | longo completo | 24,999889 min | ≈ 25,00 |
| U = 50, T = 25 | R5 (1) | médio completo | 15,000000 min | 15,00 |
| U = 80, T = 25 | R8 (1) | curto completo | 5,000111 min | ≈ 5,00 |

**Conclusão:** o centroide dos triângulos de saída (25 e 5), não seus picos, define o tempo; solo úmido não implica tempo zero neste modelo didático. Os pequenos desvios (1e-4) vêm da discretização.

### 6.3 Inferência completa com sobreposição (U = 35, T = 30, Δz = 0,1)
- Fuzzificação: seco 0,5; intermediário 0,5; úmido 0; baixa 0; média 0,5; alta 0,5.
- Ativadas: R2 → longo (0,5); R3 → longo (0,5); R5 → médio (0,5); R6 → longo (0,5). As demais têm h = 0.
- μagregada em z = 0; 3; 7,5; 15; 30 → 0; 0,2; 0,5; 0,5; 0,5. Altura máxima = 0,5: as três regras que concluem longo não somam.
- Σ z·μ = 2203,120833; Σ μ = 131,25; **z\* = 16,785683 min**, exibido como **16,79 min**.

**Conclusão:** conforme o esperado (≈ 16,785683; referência contínua 16,785714).

### 6.4 Simetria, alteração de regras e precisão
- U = 35, T = 20: R1, R2, R4, R5 com h = 0,5; agregação constante em 0,5 de 0 a 30; tempo **15,000000 min** (esperado 15,00).
- Todas as regras → curto, U = 50, T = 25: **5,000111 min** (esperado ≈ 5,00).
- Restaurar padrão: U = 35, T = 30, regras padrão, Δz = 0,1 e resultados limpos; recalculando, **16,785683 → 16,79 min**.

| Δz | N | Obtido (min) | Esperado (min) | Erro vs. contínuo 16,785714 |
|---|---|---|---|---|
| 0,1 | 300 | 16,785683 | 16,785683 | 3,15e-5 |
| 0,05 | 600 | 16,785706 | 16,785706 | 7,65e-6 |
| 0,01 | 3000 | 16,785714 | 16,785714 | 3,17e-8 |

**Conclusão:** a regra do ponto médio aproxima a integral; reduzir Δz reduz o erro (cerca de 4× ao dividir o passo por 2 e ~250× de 0,1 para 0,01), aproximando o centroide contínuo. Com duas casas decimais o resultado permanece 16,79 min nos três passos, mas o valor interno melhora.

### 6.5 Validação da interface e determinismo
- Bloqueados com mensagem clara e sem correção automática: U = −1, 101, vazio, espaços, `abc`, `Infinity`, `NaN`; T = 9, 41, vazio, `xyz`, `-Infinity`, `NaN`. Aceitos: 0, 100, 35, 35,5, 35.5 (U); 10, 30, 40 (T).
- Repetir a mesma configuração reproduz graus, ativações, área agregada e tempo de forma idêntica.
- Calcular direto e percorrer as cinco etapas dão saída idêntica (verificado em `tests.js` e na interface); depois da etapa 5, Avançar não faz nada.
- Denominador zero → saída inválida, sem 0, NaN ou Infinity.

**Conclusão:** validação e determinismo conforme a especificação.

## 8. Executar localmente e publicar

Local: abrir `index.html` (ou `npx serve` / `python3 -m http.server`). Testes: `node tests/tests.js`.

GitHub Pages: criar repositório público, enviar os arquivos (`git add . && git commit -m "Simulador fuzzy" && git push`), em *Settings → Pages* escolher a branch `main` e a pasta `/ (root)`, e abrir o link gerado para conferir. O arquivo `.nojekyll` já está incluído.

## 9. Observações

Animações são opcionais no enunciado e não foram implementadas; o acompanhamento é feito por gráficos, tabelas e registros de cada etapa.
