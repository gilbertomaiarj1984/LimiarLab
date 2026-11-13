# Roadmap

Ideias levantadas na sessão inicial. Nada aqui está decidido além do que consta em [`decisoes.md`](decisoes.md).

## Agora

- [x] Tela do treino de quinta para celular (séries, descanso, ilustrações).
- [x] Treinos e zonas em JSON.
- [ ] Gerar a tela a partir de `data/treinos/*.json`, em vez de HTML escrito à mão.
- [ ] Tela do treino de terça.

## Fase 1 do app (`web/`)

- [x] Tela inicial: semana de segunda a domingo, dia selecionado, "ainda nesta semana", estatísticas e realizados.
- [x] **Distribuição de intensidade** pelas zonas do teste (leve abaixo de 141, forte a partir de 157).
- [x] Plano (esta semana e a próxima), Análise (5 semanas) e Perfil.
- [x] Importação pela rotina do Claude (`POST /api/import`), PWA instalável, deploy na VPS.
- [ ] Subir na VPS (passos manuais em `infra/README.md`).
- [ ] Rotina agendada do Claude para importar Garmin todo dia.

## Próximo

- [ ] Strava como fonte direta (API) para os realizados.
- [ ] Login por usuário (esposa) e, depois, coaches com alunos.
- [ ] Registro de PSE para carga de sessão (Foster).
- [ ] **Painel semanal**: FC média dos dias leves, VFC. (Carga aguda/crônica fica fora: ver `docs/evidencias.md`.)
- [ ] **Eficiência aeróbica**: FC em pace fixo ao longo das semanas.
- [ ] Registro de cargas da musculação por exercício e sessão, para acompanhar progressão.

## Depois

- [ ] Integração direta com Garmin Connect e Strava (APIs).
- [ ] Enviar treinos de força e corrida ao relógio (alerta de FC em 135 nos dias leves).
- [ ] Cruzar sono, VFC e carga para sugerir ajustes do dia.
- [ ] Bloco de treino para a próxima prova-alvo.
