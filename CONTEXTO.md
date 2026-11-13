# Contexto do Limiar Lab

Documento de entrada para quem continuar o projeto. Valores de referência em 12/11/2026.

## Atleta

- Corredor amador em Niterói (RJ), treina de manhã cedo, muitas vezes com umidade alta e subidas.
- Relógio: **Garmin Forerunner 955**. Atividades sincronizam também com o **Strava** (descrições automáticas via strautomator).
- Tem **assessoria de corrida** que prescreve pelo **Treinus**; os treinos chegam ao Garmin como treinos agendados.
- Faz musculação 3–4x por semana, à noite.
- Volume recente de corrida: ~40–80 km por semana, com picos em agosto perto de 80 km.
- Provas recentes: trail de 42 km em Armação dos Búzios (17/10/2026, 1.145 m de ganho).
- Nenhuma prova cadastrada no calendário do Garmin até 12/11/2026.

## Números de referência

### Teste cardiopulmonar (23/07/2026, esteira)

| Marcador | FC | Velocidade na esteira | Observação |
| --- | --- | --- | --- |
| LV1 (limiar anaeróbio) | **141 bpm** | 12,5 km/h (~4:48/km) | fronteira do treino fácil |
| LV2 (ponto de compensação respiratória) | **159 bpm** | 16,2 km/h (~3:42/km) | fronteira do treino forte |
| FC máxima medida | 165 bpm | — | teste máximo (R 1,12) |
| VO2máx | 47,1 ml/kg/min | — | 115% do previsto |
| Pulso de O2 | — | — | 120% do previsto |

Sem alterações no ECG nem arritmias.

**Atenção às velocidades da esteira:** elas superestimam o ritmo na rua. Na rua, o Garmin mede o limiar de 159 bpm a ~5:03/km. Use **FC** como referência, não o pace do teste.

**FC máxima real provavelmente acima de 165:** o relógio registrou 169, 170 e 173 bpm em corridas recentes e o Garmin usa 176. Pode haver picos falsos do sensor de pulso, mas é provável que o teste tenha parado antes do máximo. Isso não muda LV1 e LV2.

### Garmin (12/11/2026)

| Métrica | Valor |
| --- | --- |
| Limiar de lactato | 159 bpm a 3,31 m/s (~5:03/km) — bate com o LV2 |
| VO2máx estimado | 48,9 (parado entre 48,1 e 49,5 desde agosto) |
| FC de repouso | 42 bpm |
| VFC (média 30 dias) | ~91 ms |
| Status de treino | Produtivo |
| Equilíbrio de carga | **Falta aeróbico leve** (66 baixo × 2.339 alto × 483 anaeróbico no mês) |
| Carga aguda / crônica | 1113 / 770 (razão 1,4, limite superior do ótimo) |
| Previsões | 5K 22:47 · 10K 48:20 · meia 1:47:44 · maratona 3:58:51 |

Referência no Strava: meia maratona em 1h48 (melhor esforço).

### Zonas

Ver [`data/zonas.json`](data/zonas.json).

- **Garmin (corrida, por limiar):** Z1 102–124 · Z2 125–140 · Z3 141–149 · Z4 150–156 · Z5 157+. **Alinhadas com o teste. Manter.**
- **Strava (manual):** Z1 até 139 · Z2 140–147 · Z3 148–155 · Z4 156–164 · Z5 165+. **Desalinhadas:** a Z5 só começa na FC máxima do teste e a Z2 começa no LV1. Ajustar para as do teste.
- **Laudo do teste:** Z1 93–131 · Z2 132–141 · Z3 141–152 · Z4 152–162 · Z5 162+.
- **Regra prática adotada:** fácil abaixo de **~135 bpm** · forte acima de **~157 bpm**.

## Semana de treino

| Dia | Corrida (manhã) | Academia (noite) |
| --- | --- | --- |
| Seg | Rodagem leve 40–50 min (Treinus: "Z1 regenerativo") | Superiores |
| Ter | Intervalado, normalmente com descanso parado | Inferiores **pesado** |
| Qua | Descanso | Superiores + core |
| Qui | Areia ou fartlek | Inferiores **leve** |
| Sex | Descanso | (opcional) superiores |
| Sáb | Longão (ex.: 18 km em 14/11) | — |
| Dom | Descanso | — |

Detalhes e o porquê de cada ajuste em [`docs/decisoes.md`](docs/decisoes.md).

## Diagnóstico principal

**Os dias leves não estão leves.** Nas 12 corridas de 15/10 a 12/11, a FC média ficou entre 137 e 151 bpm, ou seja, praticamente tudo no LV1 ou acima. Exemplo: em 09/11 o Treinus pediu "40 min Z1 regenerativo" e a corrida saiu com FC média 144. Os longões de sábado também saem acima do LV1 (150, 144, 151).

Consequência: muito treino na zona moderada, pouco treino realmente leve e pouco realmente forte. Isso combina com o VO2máx estimado parado há 3 meses e o alerta de "falta aeróbico leve" do Garmin.

Análise completa em [`docs/analise-intensidade-2026-11.md`](docs/analise-intensidade-2026-11.md).

## Musculação

Treino de força reorganizado para corredor: exercícios unilaterais, cadeia posterior de quadril, sóleo, estabilidade de quadril e core, com um dia pesado (terça) e um leve (quinta, véspera do longão). Ver [`docs/musculacao.md`](docs/musculacao.md) e [`data/treinos/`](data/treinos/).

## Pendências

- Integrar o histórico completo do Garmin quando o upload estiver disponível no conector athletedata (que também precisa de plano ativo).
- Levar o laudo cardiopulmonar e o padrão de FC dos dias leves para o treinador da assessoria.
- Ajustar as zonas no Strava.
- Definir a próxima prova-alvo.
