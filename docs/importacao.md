# Importação de dados

Os realizados vêm do Strava, que o próprio app lê (botão Atualizar e rotina das 9h; ver D19). O que o Strava não traz (zonas de FC, treinos agendados no Garmin, plano de força) chega por uma rotina do Claude com o conector Garmin (só leitura), que monta um lote JSON e envia para `POST /api/import`. Os números de exemplo estão em [`web/fixtures/semana-2026-11-09.json`](../web/fixtures/semana-2026-11-09.json).

## Requisição

```
POST https://limiar.143-95-214-240.sslip.io/api/import
Authorization: Bearer <IMPORT_TOKEN>
Content-Type: application/json
```

- Limite de 2 MB por lote.
- **Validação estrita:** um campo desconhecido ou inválido recusa o lote inteiro (HTTP 422, com o caminho de cada erro). Nada é gravado pela metade.
- Respostas: `200 {ok, planned, activities, removed}`, `400` JSON inválido, `401` token errado, `404` atleta inexistente, `413` lote grande, `422` validação.
- Reenviar o mesmo lote é seguro: tudo é upsert por `(atleta, source, external_id)`.

## Formato

```json
{
  "athlete": "giba",
  "planned_replace": [{ "source": "garmin", "from": "2026-11-09", "to": "2026-11-15" }],
  "planned": [
    { "source": "garmin", "external_id": "1836423041", "date": "2026-11-14", "sport": "run",
      "kind": "longo", "title": "Longão 18 km", "target_distance_m": 18000, "target_hr_max": 138 }
  ],
  "activities": [
    { "source": "garmin", "external_id": "20983...", "start_time": "2026-11-12T06:27:11-03:00",
      "sport": "run", "kind": "corrida_leve", "name": "Rodagem", "duration_s": 2903, "distance_m": 8100,
      "elevation_gain_m": 31, "avg_hr": 143, "max_hr": 152,
      "hr_zones": [{ "min_bpm": 102, "seconds": 60 }, { "min_bpm": 125, "seconds": 900 }] }
  ]
}
```

| Campo | Regras |
| --- | --- |
| `source` | minúsculas: `garmin`, `strava`, `limiarlab`, `claude`, `manual` |
| `sport` | `run`, `strength`, `other` |
| `kind` | ver `KINDS` em `web/lib/domain.ts` (`corrida_leve`, `longo`, `qualidade`, `prova`, `corrida`, `forca_inferiores`, `forca_superiores`, `forca`, `mobilidade`, `descanso`, `outro`) |
| `start_time` | ISO 8601 **com fuso**. A data do dia é calculada no fuso do atleta. |
| `hr_zones` | tempo por zona do Garmin (`get_activity_hr_in_timezones`), com o limite inferior de cada zona |
| `zones` | `[{start_time, hr_zones}]`: preenche as zonas de FC de uma corrida **que já existe** (a mais próxima do início, até 10 min, com `start_time` do Garmin). Não cria atividade, então não duplica o que veio do Strava. A resposta traz quantas casaram (`zones`). |
| `planned_replace` | os planejados dessa fonte no intervalo que **não** vierem no lote são apagados (treino removido do calendário). Um planejado fora do intervalo recusa o lote. |
| `optional` | marca sessão opcional (não conta como devida) |
| `workout` | (planejado de força) slug de um treino detalhado em `workouts`, do mesmo lote ou já gravado; um slug inexistente recusa o lote |
| `races` | provas: `source`, `external_id`, `date`, `name`, `distance_m`, `elevation_gain_m`, `priority` (`A` prova-alvo, `B` no caminho, `C` como treino), `goal_time_s`, `notes`. O app mostra a prova na semana e as orientações nos dias em volta (ver `web/lib/races.ts`). Exemplo em [`web/fixtures/metas-2026-11-15.json`](../web/fixtures/metas-2026-11-15.json). |
| `races_replace` | como `planned_replace`, para provas canceladas |
| `workouts` | treinos de força detalhados: `slug`, `title`, `goal`, `duration`, `rir`, `rest`, `warmup`, `load_note`, `reference` e `exercises` (`name`, `sets`, `reps` como texto, `load`, `focus`, `tips`, `alternative`). Reenviar o mesmo slug substitui o treino. Exemplo em [`web/fixtures/plano-2026-11-16.json`](../web/fixtures/plano-2026-11-16.json). |

Força vinda do Garmin chega só como `strength`. O app infere inferiores ou superiores pelo plano do dia quando existe exatamente uma sessão de força específica planejada.

## Prompt da rotina do Claude

Roda todo dia às 8h30 (Brasília), antes da atualização das 9h do Strava no app.

> Para o atleta `giba`, monte um lote para `POST /api/import` do LimiarLab e envie com o token do ambiente (`IMPORT_TOKEN`, header `Authorization: Bearer`). Só leitura no Garmin e no Strava; nada é escrito neles.
> 1. Zonas: leia no Garmin as corridas dos últimos 3 dias e, para cada uma, o tempo por zona de FC (`get_activity_hr_in_timezones`). Envie em `zones` com o `start_time` do Garmin (fuso -03:00) e `hr_zones` (`min_bpm` e `seconds` de cada zona). **Não envie `activities`**: elas vêm do Strava.
> 2. Planejados: leia os treinos agendados no Garmin para hoje e os próximos 14 dias e envie em `planned` (`source: "garmin"`, `external_id` do treino agendado), com `planned_replace` para `garmin` cobrindo exatamente esse intervalo. Classifique `kind` pelo título; rodagem leve é `corrida_leve`; na dúvida use `corrida`.
> 3. Força: as sessões de força do plano semanal (`source: "limiarlab"`, com `workout` e `workouts`) só são enviadas quando o plano mudar; não reenvie sem necessidade.
> 4. Se vier 422, corrija os campos apontados e reenvie uma vez. Mostre a resposta.
> 5. Antes de montar ou mudar um treino de força, leia o histórico em `GET /api/forca/historico` (mesmo token) e leve em conta o que vem sendo feito: exercícios trocados com frequência (e o motivo), os que ficam pela metade ou de fora, e a PSE das sessões.

## Histórico de força (leitura)

`GET /api/forca/historico?de=YYYY-MM-DD&ate=YYYY-MM-DD` com `Authorization: Bearer <IMPORT_TOKEN>`. Sem parâmetros: as últimas 8 semanas até hoje. Período máximo: 1 ano. Só leitura.

Resposta:

- `registros`: um por treino de força confirmado no app (tela do treino, "Confirmar treino"), com `data`, `treino` (slug), `titulo`, `pse` (0–10, opcional), `obs` e `itens`. Cada item: `ex` (posição), `nome` e `id` do que foi feito (id da base de equivalência), `plano` (`nome` e `id` do que estava prescrito), `trocado`, `series_plano`, `reps`, `series_feitas`, `situacao` (`feito`, `parcial` ou `nao_feito`) e `motivo` (`ocupado`, `sem_equipamento`, `dor`, `cansaco`, `tempo`, `preferencia`, `outro` ou `null`).
- `resumo`: por exercício, quantas vezes foi feito, quantas entrou como troca, quantas foi trocado por outro, quantas ficou de fora, séries somadas e última data.

O registro é um retrato do momento da confirmação: mudar o treino ou a base depois não altera o histórico.
