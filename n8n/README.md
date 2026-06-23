# Integração n8n · Painel de Checking (2ª fase)

Tudo o que falta no fluxo para o painel novo funcionar 100%. Ordem de execução:

1. Rodar `01-schema-bigquery.sql` no BigQuery (cria 4 tabelas novas).
2. Importar `02-novos-nodes.json` no n8n (Workflows > Import from File). Ele traz 9 pares de nó (BigQuery + Responder).
3. Ligar cada nó BigQuery a uma saída nova do Switch principal (instruções abaixo).
4. Adicionar as rotas novas no Switch (`action`).

## Rotas novas para adicionar no Switch (campo `action`)

Abra o nó Switch principal (o que já tem `get_stats`, `approve`, etc.) e adicione uma saída para cada uma destas, com `outputKey` igual ao nome:

| action novo              | liga no nó BigQuery               | Responder                       |
|--------------------------|-----------------------------------|---------------------------------|
| `assign_responsible`     | Atribuir Responsavel              | Responder Atribuir Responsavel  |
| `get_responsaveis`       | Listar Responsaveis               | Responder Responsaveis          |
| `add_comment`            | Adicionar Comentario              | Responder Comentario            |
| `get_history`            | Historico do PI                   | Responder Historico             |
| `set_supplier_rating`    | Classificar Fornecedor            | Responder Classificacao         |
| `get_suppliers`          | Listar Fornecedores               | Responder Fornecedores          |
| `update_checking_status` | Atualizar Status Checking         | Responder Atualizar Status      |
| `save_sla_config`        | Salvar SLA Config                 | Responder SLA                   |
| `get_sla_config`         | Ler SLA Config                    | Responder Ler SLA               |

Cada par BigQuery -> Responder já vem conectado no JSON. Você só liga a saída do Switch na entrada do nó BigQuery.

## Ajustes em nós que JÁ existem

### 1. E-mail ao fornecedor quando aprovado (Anne)
Hoje só `Email - Notificacao Reprovacao` dispara. Para notificar em aprovação:
- Após `BigQuery - Aprovar`, adicione um ramo: `BigQuery - Dados do Checking` (reuso) -> nó `Code` montando HTML de aprovação -> `Email Send` (mesma credencial SMTP). Assunto: `Checking Aprovado - PI {{ n_pi }}`.

### 2. Cruzar responsável nas leituras (Camilo)
Para o PI já vir com o dono atribuído, edite os SELECT de `get_pending`, `get_all_checkings` e `get_checkings` adicionando:
```sql
LEFT JOIN `checking-grupoom.form_checking.pi_responsaveis` r
  ON r.n_pi = c.n_pi
  AND r.mes_referencia = FORMAT_TIMESTAMP('%Y-%m', c.ingestion_time)
```
e inclua `r.responsavel, r.responsavel_nome` nas colunas retornadas.

### 3. Privacidade / produtividade só para gestor (decisão da diretoria)
No `get_stats` / relatório, só devolva métricas individuais (SLA por pessoa, ranking) se `{{ $json.authenticatedUser?.role }}` for `admin` ou `manager`. Para `analyst`/`viewer`, retorne só os agregados do time. Isso evita exposição de produtividade individual.

### 4. Export PDF (`export_pdf`)
A cloud function `slides_checking` já é chamada via HTTP. Se ela aceita `format: 'pdf'`, basta criar a rota `export_pdf` reaproveitando o nó `HTTP Request` com `{{ {...$json.body, format:'pdf'} }}`. Se não, adicione o parâmetro de formato na function.

### 5. Divisão mensal (Marlene)
Crie um node `Schedule Trigger` (1x/mês, dia 1) -> `Code` que verifica PIs do mês sem responsável em `pi_responsaveis` -> grava notificação ("Separar demandas do mês X"). O painel já lê notificações via `get_notifications`.

## Segurança (revisar antes de produção)
Os SELECT/INSERT usam interpolação `{{ }}` no padrão dos nós atuais. Para texto livre (comentário, motivo), prefira BigQuery query parameters (@param) em vez de concatenar, evitando SQL injection. O nó `Adicionar Comentario` já remove aspas simples como mitigação mínima.
