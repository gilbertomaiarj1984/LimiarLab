# Limiar Lab

Ferramenta pessoal de corrida e treinamento baseada em dados: cruza Garmin, Strava e testes fisiológicos para manter os dias leves realmente leves e os dias fortes realmente fortes.

O nome vem do conceito que orienta tudo aqui: os **limiares ventilatórios** medidos em teste cardiopulmonar (LV1 = 141 bpm, LV2 = 159 bpm) separam as intensidades de treino. O app existe para ajudar a treinar do lado certo de cada limiar.

## Estado atual

Projeto em fase inicial. O que existe hoje veio de uma sessão de análise com Claude (12–13/11/2026):

| Pasta | Conteúdo |
| --- | --- |
| [`CONTEXTO.md`](CONTEXTO.md) | **Leia primeiro.** Perfil do atleta, números fisiológicos, zonas, semana de treino e diagnóstico. Serve de contexto para qualquer pessoa ou agente (Claude, Codex etc.) que continue o projeto. |
| [`docs/decisoes.md`](docs/decisoes.md) | Registro das decisões tomadas e o porquê de cada uma. |
| [`docs/historico.md`](docs/historico.md) | Resumo cronológico das discussões da sessão. |
| [`docs/analise-intensidade-2026-11.md`](docs/analise-intensidade-2026-11.md) | Análise das últimas 4 semanas de corrida (Garmin). |
| [`docs/musculacao.md`](docs/musculacao.md) | Avaliação do treino de força e a proposta para corredor. |
| [`docs/roadmap.md`](docs/roadmap.md) | Ideias e próximos passos da aplicação. |
| [`data/`](data/) | Dados estruturados: zonas, semana de treino e treinos de força em JSON. |
| [`app/web/`](app/web/) | Primeira tela: treino de inferiores de quinta, para usar no celular. |
| [`assets/svg/`](assets/svg/) | Ilustrações dos exercícios. |

## Rodar a tela do treino

Não há build. Abra o arquivo direto no navegador:

```bash
open app/web/inferiores-quinta.html      # macOS
xdg-open app/web/inferiores-quinta.html  # Linux
```

A página funciona offline (só as fontes vêm do Google Fonts), marca as séries feitas no próprio navegador e tem contador de descanso de 75 s.

## Fontes de dados

- **Garmin Connect** (Forerunner 955): atividades, FC, limiar de lactato, VO2máx estimado, VFC, carga de treino, treinos agendados.
- **Strava**: histórico de atividades e zonas configuradas.
- **Treinus**: plataforma da assessoria que envia os treinos de corrida para o Garmin.
- **Teste cardiopulmonar** (jul/2026): limiares, VO2máx e FC máxima medidos.

## Privacidade

Este repositório é **público**. Exames de sangue, laudos em PDF e dados de saúde detalhados ficam fora dele. A pasta `private/` está no `.gitignore` para guardar esse material localmente.
