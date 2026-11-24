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
- **Decisão:** Next.js 16 + postgres.js + PWA, numa pasta `web/`, rodando na VPS como app isolado (`/opt/limiarlab`, container `limiarlab-app`, banco próprio num Postgres só do LimiarLab (ver D18), Caddy compartilhado).
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

## D17 · Metas com prioridade de prova

- **Data:** 15/11/2026
- **Decisão:** cada prova tem prioridade A (prova-alvo, polimento de 2 semanas), B (no caminho, mini-polimento de uma semana) ou C (como treino). O app mostra a prova na semana, uma tela de Metas com a contagem e as orientações dia a dia em volta de cada prova.
- **Por quê:** o atleta tem uma prova de 15 km em 13/12 que não é a alvo, mas precisa entrar no planejamento. Regras e força da evidência em [`evidencias.md`](evidencias.md).
- **Estado:** adotada; prova-alvo a definir.


## D18 · Postgres próprio, sem tocar nos outros apps da VPS

- **Data:** 17/11/2026
- **Decisão:** o LimiarLab sobe o seu próprio Postgres (`limiarlab-postgres`, 256 MB) no mesmo compose do app, em vez de usar o Postgres compartilhado do garimpo. Substitui o plano de banco/role/rede dedicados na instância compartilhada (D13). O único recurso compartilhado que sobra é o Caddy, com um arquivo novo em `sites/`.
- **Por quê:** regra do atleta: nenhum app que já roda pode ser afetado. Usar o Postgres do garimpo exigia religar a rede nele e alterar o compose do outro repositório; o deploy dele recria o container do Postgres (indisponibilidade breve para garimpo e AgendaBoa) e um `docker network connect` manual se perde nessa recriação. Um Postgres próprio custa ~100 a 150 MB de RAM e elimina esses riscos.
- **Estado:** adotada.

## D19 · Atualização dos realizados pelo Strava dentro do app

- **Data:** 17/11/2026
- **Decisão:** o botão "Atualizar" e uma rotina diária às 9h (fuso do atleta, dentro do app) leem o Strava pela API oficial (só leitura, escopo `activity:read_all`) e gravam só atividades novas. Atividades do Strava que vêm do Garmin (`external_id` `garmin_push_<id>`) entram como fonte `garmin` com o mesmo id, sem duplicar. Parcialmente substitui D15 (Strava direto era fase 2).
- **Por quê:** o app na VPS não alcança o conector Garmin, que só existe nas sessões do Claude; o Strava espelha o Garmin (308 atividades iguais no último ano). Sem credencial do Garmin na VPS. Zonas de FC por corrida seguem pela rotina do Claude. Nunca regrava atividade existente, para não apagar zonas.
- **Estado:** adotada.

## D20 · Zonas de FC por `zones`, sem duplicar atividades

- **Data:** 17/11/2026
- **Decisão:** o lote de importação aceita `zones` (início + zonas), que só preenche `hr_zones` de uma corrida existente, a mais próxima do início (até 10 min). A rotina do Claude envia zonas e planejados; as atividades vêm só do Strava.
- **Por quê:** o Strava não traz tempo por zona, e reenviar a atividade pelo Garmin criaria linha dupla quando o id do Garmin não vem no Strava.
- **Estado:** adotada.

## D21 · Histórico do treino de força confirmado pelo atleta

- **Data:** 18/11/2026
- **Decisão:** quando o treino de força do dia aparece como feito (atividade do relógio casada com o plano), o app pede para confirmar os exercícios na tela do treino: o que foi feito (com as trocas), séries feitas, motivo de troca ou de incompleto, PSE da sessão (CR-10, Foster et al., 2001) e observação. Fica gravado em `strength_logs` como retrato do momento. A rotina que prescreve lê em `/api/forca/historico`. A confirmação também acerta as trocas do dia no servidor.
- **Por quê:** o Garmin registra só "força", sem saber o que foi feito. Sem o histórico real, a prescrição não enxerga trocas recorrentes (ex.: saltitos trocados pela panturrilha explosiva no leg press em 18/11) nem o que fica de fora. Dados estruturados também servem para análise futura por IA.
- **Estado:** adotada.

## D22 · Mapa de calor e volume por músculo pela contagem fracionada

- **Data:** 18/11/2026
- **Decisão:** cada série feita conta 1 para o músculo principal do exercício e 0,5 para o secundário (grupos da base de equivalência). A aba Análise mostra o mapa de calor do corpo (esta semana ou 2 semanas), a tabela de séries por músculo das últimas 5 semanas e a aderência (treinos feitos, séries feitas, trocas e motivos). Referências do volume: abaixo de ~5 séries semanais o ganho tende a ser menor e 10 ou mais se associa a mais hipertrofia (Schoenfeld, Ogborn e Krieger, 2017, meta-análise); acima de 20 o app avisa por fadiga (referência prática, sem corte firme). Alerta de pouco volume só para os músculos de perna (foco em longos e ultra) e só em semana fechada com treino confirmado.
- **Por quê:** é a forma mais simples e transparente de somar exercícios diferentes no mesmo músculo; o peso 0,5 para o secundário é convenção usada em análises de dose-resposta de volume, não medida exata.
- **Estado:** adotada.

## D23 · IA configurável com provedor escolhido no app

- **Data:** 24/11/2026
- **Decisão:** a aba Perfil tem uma seção **IA** onde se escolhe o provedor (Claude, Gemini ou Groq free tier) e o modelo, com selo de chave por provedor e botão Testar. A camada (`web/lib/ai/`) é portada do app Leilão Finder Buddy: fetch puro nos três provedores, sem dependência nova, retry em erro transitório e failover para os outros provedores com chave quando o escolhido está sem quota ou fora do ar. As chaves (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`) ficam só em `.env.production` na VPS (mesmas do garimpo, por escolha do Giba), nunca no banco, no repo nem no navegador. Toda chamada passa por `askAi` e é gravada em `ai_runs` (tipo, provedor, modelo, entrada, saída, tokens, latência, erro, troca de provedor). A escolha fica em `ai_settings`, por atleta.
- **Por quê:** o Giba quer plugar IA para análises futuras (relatório semanal, prontidão) sem trocar de código para trocar de provedor, e quer histórico estruturado de tudo. Só entram ids de modelo já confirmados em produção no garimpo (um id inventado dá 400 e não faz failover). A mesma chave nos dois apps significa a mesma cota: se um esgotar o free tier, o outro sofre.
- **Estado:** adotada. Ainda sem análise de IA ligada; a primeira será definida depois.

