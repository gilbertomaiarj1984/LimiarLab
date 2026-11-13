# Evidências usadas no app

Cada regra numérica do LimiarLab aponta para a referência que a sustenta, com o grau de confiança. Quando a evidência é fraca, o app avisa com cautela em vez de afirmar.

| Regra no app | Referência | Força da evidência |
| --- | --- | --- |
| Intensidade em 3 faixas pelos limiares do teste (leve abaixo do LV1, forte a partir do LV2 aproximado) | Seiler & Kjerland, 2006, Scand J Med Sci Sports. [PubMed 16430681](https://pubmed.ncbi.nlm.nih.gov/16430681/) | Observacional em atletas de elite; modelo de 3 zonas amplamente usado. |
| Meta de ~80% do tempo leve (distribuição polarizada ou piramidal) | Stöggl & Sperlich, 2014, Front Physiol, doi 10.3389/fphys.2014.00033. [PMC3912323](https://pmc.ncbi.nlm.nih.gov/articles/PMC3912323) · Casado et al., 2022, revisão sistemática em fundistas. [PubMed 35418513](https://pubmed.ncbi.nlm.nih.gov/35418513/) | Ensaios curtos e revisão; a proporção exata varia entre polarizado e piramidal. "~80%" é referência, não regra rígida. |
| Força pesada e pliometria para economia de corrida | Rønnestad & Mujika, 2014, Scand J Med Sci Sports. [PubMed 23914932](https://pubmed.ncbi.nlm.nih.gov/23914932/) · Blagrove et al., 2018, Sports Med. [PMC5889786](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5889786/) | Revisões sistemáticas com efeito consistente em economia de corrida. |
| Aviso de salto de volume acima de 30% na semana | Nielsen et al., 2014, J Orthop Sports Phys Ther 44(10):739-747, doi 10.2519/jospt.2014.5164, [PubMed 25155475](https://pubmed.ncbi.nlm.nih.gov/25155475/), [resumo](https://vbn.aau.dk/da/publications/excessive-progression-in-weekly-running-distance-and-risk-of-runn) | **Fraca.** 874 iniciantes; progressão acima de 30% teve HR 1,59 (IC95% 0,96–2,66, p = 0,07) para lesões ligadas à distância. Exploratório e não significativo. Por isso o texto do app é um aviso cauteloso. |
| Carga por "ACWR" **não** é usada | Impellizzeri et al., 2020. [PMC7534938](https://pmc.ncbi.nlm.nih.gov/articles/PMC7534938) | Crítica metodológica forte ao ACWR; ficou de fora de propósito. |
| Carga de sessão por PSE × minutos (fase 2) | Foster et al., 2001, J Strength Cond Res 15(1):109-115 | Método validado e simples; entra quando houver registro de PSE. |
| Volume de musculação para hipertrofia de superiores (estética) | Schoenfeld et al., 2017, J Sports Sci. [PubMed 27433992](https://www.pubmed.gov/27433992/) | Meta-análise dose-resposta; ~10+ séries semanais por grupo. |

## Regras de cálculo

- **Faixas por zona do Garmin.** O Garmin entrega o tempo em cada zona com o limite inferior em bpm. Uma zona inteira abaixo do LV1 (141) conta como leve. Uma zona que começa em 157 ou mais conta como forte. Todo o resto conta como moderado, inclusive uma zona que cruza o LV1. Isso evita chamar de leve um tempo que pode ter sido acima do limiar.
- **Percentuais** usam o método do maior resto, para que leve + moderado + forte sempre somem 100.
- **Dia leve fora do alvo:** rodagem ou longo com FC média acima do LV1.
