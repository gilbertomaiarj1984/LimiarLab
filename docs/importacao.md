# Importação de dados

O app não fala direto com Garmin nem Strava nesta fase. Uma rotina do Claude (com os conectores Garmin e Strava, só leitura) monta um lote JSON e envia para `POST /api/import`. Os números de exemplo estão em [`web/fixtures/semana-2026-11-09.json`](../web/fixtures/semana-2026-11-09.json).

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
| `planned_replace` | os planejados dessa fonte no intervalo que **não** vierem no lote são apagados (treino removido do calendário). Um planejado fora do intervalo recusa o lote. |
| `optional` | marca sessão opcional (não conta como devida) |

Força vinda do Garmin chega só como `strength`. O app infere inferiores ou superiores pelo plano do dia quando existe exatamente uma sessão de força específica planejada.

## Prompt da rotina do Claude

> Para o atleta `giba`, monte um lote para `POST /api/import` do LimiarLab cobrindo a semana atual (segunda a domingo) e a próxima.
> 1. Atividades: leia no Garmin as atividades de segunda passada até hoje. Para cada corrida, leia também o tempo por zona de FC. Use `source: "garmin"` e o `activityId` como `external_id`. Corrida em esteira ou rua vira `sport: "run"`; musculação vira `strength`.
> 2. Planejados: leia os treinos agendados no Garmin para as duas semanas (`source: "garmin"`) e inclua `planned_replace` para `garmin` cobrindo exatamente esse intervalo. Inclua as sessões de força do plano semanal com `source: "limiarlab"` e um `planned_replace` próprio.
> 3. Classifique `kind` pelo título do treino; rodagem leve é `corrida_leve`; na dúvida use `corrida` para corrida e `forca` para força (o app infere inferiores ou superiores pelo plano).
> 4. Não escreva nada no Garmin nem no Strava. Envie o lote com o token guardado no ambiente e mostre a resposta. Se vier 422, corrija os campos apontados e reenvie uma vez.
