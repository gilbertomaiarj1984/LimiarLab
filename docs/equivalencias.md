# Equivalência de exercícios

Base para trocar um exercício na hora, quando o aparelho está ocupado, quebrado ou não existe na academia. Os dados ficam em [`../data/equivalencias.json`](../data/equivalencias.json) e a consulta rápida no celular em [`../app/web/equivalencias.html`](../app/web/equivalencias.html).

- **Revisado em:** 16/11/2026
- **Próxima revisão:** 01/12/2026 (mensal, ver [Revisão mensal](#revisão-mensal))

## Como trocar em 30 segundos

1. **Primeiro tente reordenar, não trocar.** Se o aparelho libera em 2 a 3 minutos, faça o próximo exercício e volte. Exceção: o que é técnico ou pesado (pogo, agachamento pesado, step-up) fica no começo do treino, enquanto tornozelo e quadril estão descansados. Se esse estiver ocupado, troque em vez de empurrar para o fim.
2. **Abra o exercício do treino e pegue o primeiro substituto disponível.** A lista já vem ordenada do mais parecido para o menos parecido.
3. **Mantenha o padrão de movimento e o objetivo do dia.** Terça é força pesada (1 a 2 repetições sobrando). Quinta é estímulo leve, véspera do longão (2 a 3 sobrando).
4. **Refaça a carga pela reserva, não pelo número do aparelho.** Carga de máquina não passa para halter nem para outra máquina. Use a primeira série como teste: escolha uma carga conservadora, veja quantas repetições sobraram e ajuste nas seguintes.
5. **Anote a troca** no registro do treino (exercício usado e carga). Isso alimenta a revisão do mês.

## Regras que não mudam

- **Quinta (véspera do longão):** nenhum exercício novo com excêntrico pesado (nórdico, stiff pesado, búlgaro pesado pela primeira vez) e nenhuma pliometria. Exercício novo costuma dar mais dor muscular tardia, e a quinta fica a cerca de 34 h do longão. Quando em dúvida, escolha o substituto em máquina e mais estável.
- **Terça (pesado):** a troca precisa permitir carga alta com segurança (4 × 5–6). Exercícios muito instáveis não servem para força máxima; ficam como opção de menor equivalência.
- **Impacto:** a troca nunca aumenta o impacto em relação ao original, exceto no slot de pliometria da terça.
- **Superiores:** são estética. A troca não pode cansar lombar ou pernas (por isso remada curvada pesada com barra e terra ficam de fora).
- **Dor:** se o original dói, a troca precisa aliviar a articulação que dói. Cada exercício tem a carga articular por articulação em `carga_articular`. Dor que persiste vai para profissional, não para a lista.
- **Mesmo substituto por algumas semanas** se a troca virar permanente, para dar para medir progressão.

## Como a base está organizada

- **Catálogo (`exercicios`):** cada exercício com grupo muscular primário e secundário, padrão de movimento, equipamento, se é unilateral, impacto (0 a 3), carga por articulação, fadiga esperada, complexidade técnica, estabilidade exigida e transferência para a corrida (0 a 3, com o porquê).
- **Slots (`slots`):** um por exercício do plano. Diz o que aquele exercício entrega naquele treino, o que a troca precisa manter, os substitutos em ordem (equivalência alta, média ou baixa, ajuste de séries e carga, quando preferir, ressalva e evidência) e as trocas a **evitar** naquele contexto.

Equivalência **alta** só quando padrão, grupo e faixa de carga batem. **Média** quando muda o equipamento ou a estabilidade, mas o objetivo do dia se mantém. **Baixa** é o plano C: melhor que pular, mas não para virar rotina.

## Evidência

Cada substituto traz a referência curta no campo `evidencia`. Onde não há estudo direto, o campo diz "pratica comum". Dados de eletromiografia (EMG) mostram ativação, não ganho de força ou de massa: servem para comparar exercícios parecidos, não para provar que um é melhor.

Princípios gerais, já usados no resto do LimiarLab (ver [`evidencias.md`](evidencias.md) no app):

| Princípio | Referência | Força |
| --- | --- | --- |
| Força pesada e pliometria melhoram economia de corrida | Rønnestad & Mujika, 2014, Scand J Med Sci Sports · Blagrove et al., 2018, Sports Med | Revisão narrativa (Rønnestad & Mujika) e revisão sistemática (Blagrove et al.), efeito consistente |
| ~10+ séries semanais por grupo para hipertrofia (superiores) | Schoenfeld et al., 2017, J Sports Sci | Meta-análise dose-resposta |

Referências usadas nas trocas (conferidas uma a uma em 16/11/2026, incluindo se o texto é fiel ao achado):

| Troca | Referência | O que o estudo mostra |
| --- | --- | --- |
| Smith → agachamento livre | Schwanbeck et al., 2009, J Strength Cond Res | EMG ~43% maior no livre com a mesma 8RM (n = 6). Ativação, não ganho. |
| Smith → búlgaro | Speirs et al., 2016, J Strength Cond Res | Ganhos de força parecidos entre búlgaro e agachamento com barra em 5 semanas (jogadores de rugby). |
| Flexora sentada ↔ deitada | Maeo et al., 2021, Med Sci Sports Exerc | Sentada deu mais hipertrofia dos posteriores que deitada (iniciantes). Por isso a deitada é equivalência média. |
| Panturrilha em pé ↔ sentado | Kinoshita et al., 2023, Front Physiol | Sóleo cresceu parecido nas duas; gastrocnêmio cresceu bem mais em pé. Sentado não substitui em pé, e vice-versa. |
| Máquina/cabo → elástico | Lopes et al., 2019, SAGE Open Med | Ganhos de força parecidos com elástico e peso convencional. Poucos estudos, de baixa qualidade; fala de força, não de hipertrofia. |
| Suitcase carry → farmer walk | McGill, Marshall & Andersen, 2013, Ergonomics | Carga numa mão só exige bem mais do abdominal do lado oposto. Farmer walk é equivalência menor para core lateral. |

Uma referência foi retirada na revisão: Lusk et al., 2010 não testou pegada neutra e mostrou mais dorsal na pronada, então não sustenta a troca entre puxada aberta e neutra (ficou como prática comum).

## Figuras

Todos os exercícios do catálogo têm figura em `assets/svg/`. As das trocas são esquemáticas (bonecos de traço) e ficam em `scripts/figs_*.py`; `python3 scripts/gerar_figuras_eq.py` gera os SVGs e `python3 scripts/equivalencias.py` regenera a tela. As mais fracas, a refazer na revisão: rotação de tronco na máquina, russian twist, dead bug, pranchas laterais, remada invertida, elevação pélvica na máquina e leg press unilateral.

## Revisão mensal

Todo início de mês, revisar a lista com o uso real. Leva uns 15 minutos.

1. **Trocas feitas no mês:** quais foram usadas, quantas vezes e como foi (carga, dor no dia seguinte, efeito no longão).
2. **Academia:** aparelhos que nunca estão livres, que não existem ou que quebraram. Subir na lista o substituto que sempre funciona; tirar o que nunca está disponível.
3. **Corpo:** dores ou incômodos novos. Ajustar substitutos pela carga articular.
4. **Fase do treino:** perto de prova, bloco de ultra, recuperação. Em semana de polimento, preferir os substitutos de menor fadiga.
5. **Treinos mudaram?** Se algum arquivo de `data/treinos/` mudou, atualizar o slot correspondente.
6. **Evidência:** checar se saiu revisão ou meta-análise relevante. Só entra referência confirmada.
7. Atualizar `revisado_em` e `proxima_revisao` no JSON e registrar abaixo.

### Histórico de revisões

| Data | O que mudou | Por quê |
| --- | --- | --- |
| 17/11/2026 | Figuras para os 134 substitutos que não tinham | Pedido do Giba |
| 16/11/2026 | Primeira versão: 4 treinos (Superiores A e B, Inferiores pesado e leve), todos os exercícios com substitutos | Pedido do Giba para trocar exercício com a academia cheia |
