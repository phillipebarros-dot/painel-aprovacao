-- ============================================================
-- Painel de Checking · Grupo OM
-- 2a fase: tabelas novas no BigQuery (dataset form_checking)
-- Rode UMA vez no console do BigQuery antes de ativar os nodes novos.
-- Projeto: checking-grupoom  /  Dataset: form_checking
-- ============================================================

-- 1) DIVISAO DE DEMANDA (Camilo + Marlene)
--    Tabela enxuta n_pi + responsavel, cruzada nas leituras de checking.
--    mes_referencia no formato 'YYYY-MM' permite a divisao mensal.
CREATE TABLE IF NOT EXISTS `checking-grupoom.form_checking.pi_responsaveis` (
  n_pi           STRING    NOT NULL,
  responsavel    STRING,            -- email ou id do analista
  responsavel_nome STRING,
  mes_referencia STRING    NOT NULL,-- 'YYYY-MM'
  conta          STRING,            -- aba/conta da pauta (Boti Sul, Eudora, ...)
  atribuido_por  STRING,
  atribuido_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- 2) HISTORICO / COMENTARIOS POR PI (Phillipe + Anne)
--    Linha do tempo consultavel de notas, reenvios e motivos.
CREATE TABLE IF NOT EXISTS `checking-grupoom.form_checking.checking_comments` (
  id            STRING    NOT NULL,
  submission_id STRING    NOT NULL,
  n_pi          STRING,
  comentario    STRING,
  tipo          STRING,            -- 'nota' | 'reprovacao' | 'reenvio' | 'status'
  autor         STRING,
  autor_nome    STRING,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- 3) CLASSIFICACAO DE FORNECEDOR (interno, mídia)
CREATE TABLE IF NOT EXISTS `checking-grupoom.form_checking.suppliers` (
  veiculo     STRING    NOT NULL,
  rating      INT64,               -- 1..5 estrelas
  observacao  STRING,
  updated_by  STRING,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- 4) CONFIG DE SLA DE RISCO (perfil limite, Phillipe)
CREATE TABLE IF NOT EXISTS `checking-grupoom.form_checking.sla_config` (
  id            STRING    NOT NULL,
  horas_atencao INT64     DEFAULT 5,
  horas_risco   INT64     DEFAULT 12,
  updated_by    STRING,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
INSERT INTO `checking-grupoom.form_checking.sla_config` (id, horas_atencao, horas_risco)
SELECT 'global', 5, 12
FROM (SELECT 1)
WHERE NOT EXISTS (SELECT 1 FROM `checking-grupoom.form_checking.sla_config` WHERE id = 'global');
