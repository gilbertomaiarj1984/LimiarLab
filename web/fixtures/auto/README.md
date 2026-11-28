# Lotes de importação automática

A VPS lê `INDEX.txt` (um nome de arquivo por linha), baixa cada lote desta pasta e envia para `POST /api/import`
(`infra/autoimport.sh`, chamado pelo `autodeploy.sh` a cada 3 min). Lote já aplicado (mesmo conteúdo) não é reenviado.
O import é idempotente e atômico: lote inválido é recusado inteiro e registrado em `/opt/limiarlab/autoimport.log`.

Para um lote novo: criar o arquivo aqui, acrescentar o nome ao `INDEX.txt` e mesclar na `main`.
