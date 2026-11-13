# Registro de decisões

Cada entrada: o que foi decidido, por quê e o estado. Mais recentes no fim.

## D01 · Usar FC, não pace, como referência de intensidade

- **Data:** 12/11/2026
- **Decisão:** as fronteiras de intensidade são de FC (LV1 141, LV2 159). O pace do teste em esteira não é usado.
- **Por quê:** a esteira indicou o limiar a ~4:48/km, mas a meia de 1h48 (~5:07/km) e o limiar medido pelo Garmin na rua (159 bpm a ~5:03/km) mostram que a esteira superestima a velocidade. Na rua de Niterói, umidade e subidas mudam o pace; a FC é mais estável.
- **Estado:** adotada.

## D02 · Manter as zonas do Garmin e ajustar as do Strava

- **Data:** 12/11/2026
- **Decisão:** as zonas de corrida do Garmin (por limiar, 159 bpm) ficam como estão. As do Strava devem ser ajustadas.
- **Por quê:** o limiar do Garmin coincide com o LV2 do teste, e as fronteiras Z2/Z3 (141) e Z4/Z5 (157) batem com os limiares. No Strava, a Z5 começa em 165 (a FC máxima do teste, nunca registrada) e a Z2 começa no LV1, então ela não é fácil.
- **Estado:** pendente de ajuste no Strava.

## D03 · Dias leves abaixo de ~135 bpm

- **Data:** 12/11/2026
- **Decisão:** rodagem de segunda e a maior parte do longão de sábado abaixo de ~135–138 bpm, mesmo que o pace caia para 6:15–6:45/km. Usar alerta de FC no relógio.
- **Por quê:** as 12 corridas das últimas 4 semanas tiveram FC média entre 137 e 151; o Garmin aponta falta de aeróbico leve; VO2máx estimado parado. O planejamento da assessoria já pede leve; o problema é a execução.
- **Estado:** adotada como orientação; conversar com o treinador.

## D04 · Sessões fortes realmente fortes

- **Data:** 12/11/2026
- **Decisão:** 1–2 sessões por semana acima de ~157 bpm (intervalado de terça e fartlek/areia de quinta), em vez de tudo na zona moderada.
- **Por quê:** distribuição polarizada; o meio-termo cansa sem gerar estímulo novo.
- **Estado:** adotada como orientação.

## D05 · Não aumentar volume agora

- **Data:** 12/11/2026
- **Decisão:** manter o volume. Quando fizer sentido crescer, adicionar um rodagem leve de 30–40 min na quarta ou sexta, não mais intensidade.
- **Por quê:** razão carga aguda/crônica em 1,4, no limite superior. Primeiro corrigir a intensidade dos dias leves por algumas semanas.
- **Estado:** adotada.

## D06 · Descanso no intervalado depende do tiro

- **Data:** 12/11/2026
- **Decisão:** tiros curtos (200–400 m, VO2 de 2–4 min) podem ter descanso parado; tiros de limiar (1–2 km, ~157–162 bpm) com descanso trotando.
- **Estado:** orientação.

## D07 · Inferiores pesado na terça, leve na quinta

- **Data:** 12/11/2026
- **Decisão:** a musculação de inferiores continua no mesmo dia dos treinos de qualidade, mas terça é pesada e quinta é leve e curta.
- **Por quê:** a quinta à noite fica a ~34 h do longão de sábado. Pernas cansadas ajudam a explicar a FC alta nos sábados.
- **Estado:** adotada. Quinta testada em 12/11 ("foi bom").

## D08 · Reformular o treino de força para corredor

- **Data:** 12/11/2026
- **Decisão:** adicionar exercícios unilaterais (step-up, búlgaro), cadeia posterior de quadril (stiff ou hip thrust), sóleo (panturrilha sentado), força pesada (agachamento 4 × 5–6 na terça), pliometria leve e core antirrotação. Extensora e flexora viram acessórios.
- **Por quê:** o treino original era todo bilateral, em máquina e em 12 repetições. Força pesada e pliometria têm a melhor evidência de ganho de economia de corrida.
- **Estado:** quinta adotada; terça proposta.

## D09 · Ajustes do treino de quinta escolhidos pelo atleta

- **Data:** 12/11/2026
- **Decisões:**
  - Monster walk trocado por **abdutora sentada com tronco inclinado** (preferência por aparelho).
  - Prancha lateral mantida.
  - Dead bug trocado por **prancha frontal**.
  - Ordem final: step-up → flexora → panturrilha em pé → abdutora inclinada → sóleo → prancha lateral → prancha frontal. Step-up primeiro porque é o mais técnico e depende de tornozelo e quadril descansados.
  - Step-up com um halter em cada mão; variação futura com um halter na mão contrária à perna que sobe.
  - Carga indicada como % de 1RM, com a regra prática de ~80–85% da carga usada no 4 × 12 e a referência final de 2–3 repetições sobrando (RIR 2–3).
- **Estado:** adotadas. Ver [`data/treinos/inferiores-quinta.json`](../data/treinos/inferiores-quinta.json).

## D10 · Superiores 2x por semana basta

- **Data:** 12/11/2026
- **Decisão:** priorizar costas (remadas e puxadas) e incluir core antirrotação (pallof press, prancha). A sexta pode virar descanso total.
- **Estado:** sugestão.

## D11 · Nome e repositório

- **Data:** 13/11/2026
- **Decisão:** o projeto se chama **Limiar Lab**, versionado em `gilbertomaiarj1984/LimiarLab`.
- **Por quê:** "Limiar" é o conceito fisiológico que orienta as decisões; "Lab" marca a abordagem baseada em dados e experimentação.

## D12 · Dados de saúde fora do repositório público

- **Data:** 13/11/2026
- **Decisão:** exames de sangue e PDFs de laudo ficam fora do repositório (pasta `private/` no `.gitignore`). Ficam no repositório apenas os números usados no treino (limiares, FC, VO2máx).
- **Por quê:** o repositório é público.
- **Estado:** a confirmar com o atleta.

## D13 · Stack do app igual à do AgendaBoa

- **Data:** 13/11/2026
- **Decisão:** Next.js 16 + postgres.js + PWA, numa pasta `web/`, rodando na VPS como app isolado (`/opt/limiarlab`, container `limiarlab-app`, banco e rede `limiarlab_db` próprios no Postgres compartilhado, Caddy compartilhado).
- **Por quê:** a VPS já roda esse modelo; reaproveita deploy, backup e regras de isolamento.
- **Estado:** adotada (aprovada pelo atleta).

## D14 · Senha dentro do app em vez de autenticação básica no Caddy

- **Data:** 13/11/2026
- **Decisão:** a tela `/entrar` pede uma senha (`APP_PASSWORD`) e grava um cookie assinado por 180 dias. `/api/import` usa um token próprio.
- **Por quê:** o aprovado era senha no Caddy, mas a autenticação básica do navegador funciona mal em PWA instalado no iPhone (pede a senha de novo ou falha ao abrir pela tela inicial). O efeito é o mesmo: nada é visível sem senha.
- **Estado:** adotada; a confirmar com o atleta.

## D15 · Fontes de dados da fase 1

- **Data:** 13/11/2026
- **Decisão:** uma rotina do Claude lê Garmin (realizados e treinos agendados) e o plano semanal, e envia ao app. Strava direto fica para a fase 2. Nada é escrito no Garmin.
- **Por quê:** o Claude já tem os conectores; evita guardar credenciais do Garmin na VPS.
- **Estado:** adotada.

## D16 · Regra das 3 faixas de intensidade

- **Data:** 13/11/2026
- **Decisão:** pelo tempo por zona do Garmin, leve = zona inteira abaixo do LV1 (141), forte = zona a partir de 157, moderado = o resto (inclui a zona que cruza o LV1). Meta de referência ~80% leve. Salto de volume acima de 30% gera aviso cauteloso.
- **Por quê:** usa os limiares do teste cardiopulmonar; na dúvida, não chama de leve. Referências e força de cada uma em [`evidencias.md`](evidencias.md).
- **Estado:** adotada.
