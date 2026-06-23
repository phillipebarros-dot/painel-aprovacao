# Manual de Funções — Painel de Aprovação de Checking

> Este manual descreve **como funciona** cada área do painel, sem detalhar o visual.
> Última atualização: 23/06/2026

---

## 1. Login e Autenticação

- **Login com Google (SSO)**: Clique em "Entrar com Google" para autenticar usando sua conta corporativa. A foto do perfil Google aparece no avatar do painel.
- **Login com email/senha**: Alternativa manual para contas sem SSO.
- **Sessão**: Expira automaticamente após 15 minutos de inatividade. O token é protegido por criptografia em sessão.
- **Permissões**: Existem 3 perfis de acesso:
  - **Admin**: Acesso total a todas as telas, incluindo Usuários, Operações e Automações.
  - **Analyst (Analista)**: Pode aprovar/reprovar checkings, ver alertas e relatórios. Não acessa Usuários nem Operações.
  - **Viewer (Visualizador)**: Somente leitura. Não pode aprovar nem reprovar.

---

## 2. Dashboard

O painel principal com visão operacional completa.

### KPIs (Indicadores)
- **Pendentes agora**: Total de checkings aguardando decisão no período selecionado.
- **Aprovados**: Quantidade aprovada + taxa de aprovação (%) no período.
- **Reprovados**: Quantidade reprovada + total de decididos.
- **SLA médio**: Tempo médio entre recebimento e decisão. Meta padrão: 4 horas.

### Filtros de Período
- **7 dias / 30 dias / 90 dias**: Mostra dados dos últimos N dias.
- **Mês cheio**: Selecione um mês específico (ex: "jun/2026") para ver **apenas os dados daquele mês**. Todos os KPIs, gráficos, rankings e distribuições atualizam.

### Gráficos
- **Volume de checkings por dia**: Gráfico de tendência ou empilhado (aprovado/reprovado/pendente).
- **Taxa de aprovação (Donut)**: Proporção visual de aprovados vs. reprovados com porcentagem exata.
- **Heatmap de SLA**: Mapa de calor mostrando dias da semana × horários com maior volume de decisões.
- **Funil de aprovação**: Mostra a jornada: Recebidos → Em análise → Decididos → Aprovados.
- **Calendário**: Visualiza quantos checkings foram recebidos em cada dia do mês.

### Rankings
- **Top veículos**: Os veículos/fornecedores com mais checkings no período.
- **Top clientes**: Os clientes com mais demandas.
- **Avaliação de fornecedores**: Ranking baseado em taxa de aprovação.

### Exportação
- **CSV**: Exporta todos os checkings do período em formato planilha.
- **PDF**: Gera relatório visual com os dados filtrados.

---

## 3. Aprovações

Tela principal de trabalho para aprovar ou reprovar checkings.

### Visões
- **Tabela**: Lista com colunas ordenáveis (PI, veículo, cliente, data, status, responsável).
- **Cards**: Visualização em cartões com preview dos dados.

### Ações por checking
- **Aprovar**: Marca como aprovado.
- **Aprovar com ressalva**: Aprova, mas registra uma observação/sugestão.
- **Reprovar**: Reprova com motivo obrigatório.
- **Sem checking**: Marca como "sem necessidade de checking".
- **Reabrir**: Reverte a decisão, voltando o checking para a fila pendente.

### Funcionalidades
- **Atribuir responsável**: Define quem é responsável por cada checking.
- **Comentários**: Adiciona observações internas ao checking.
- **Status de verificação**: Marca etapas de verificação (ex: "Em andamento", "Verificado").
- **Revisar em sequência (Triage)**: Botão para revisar vários checkings pendentes em fila, um por um.

---

## 4. Revisão (Tela de Detalhes)

Ao clicar em um checking, abre a tela de revisão completa.

### Informações exibidas
- Dados do PI: número, veículo, cliente, meio, praça, valores.
- Contato do fornecedor (nome, email, telefone).
- **Arquivos anexados**: Previews de imagens, PDFs e vídeos do Google Drive.
  - Imagens com thumbnail do backend aparecem inline.
  - Arquivos sem preview disponível mostram botão "Abrir no Drive".
- **Timeline**: Histórico completo de ações (aprovações, reprovações, reabertura, comentários).

### Agente Nero (IA)
- Análise automática de confiança baseada em regras heurísticas.
- Mostra pontuação (%) e classificação (alta/média/baixa confiança).
- **Não decide sozinho**: Apenas sugere. A decisão final é sempre do analista.

---

## 5. Produção

Gestão de demanda e produtividade da equipe.

### Para Admin
- **Divisão de demanda**: Distribui checkings pendentes entre os analistas.
- **Produtividade por analista**: Vê quantos checkings cada pessoa decidiu, tempo médio, taxa de aprovação.
- **Distribuição por meio**: Gráfico mostrando volume por tipo de mídia.

### Para Analista
- **Minhas tarefas**: Mostra apenas os checkings atribuídos ao analista logado.
- **Fila do dia**: Checkings pendentes para trabalhar.

---

## 6. Alertas

Central de monitoramento de SLA e situações críticas.

### Tipos de alerta
- **SLA estourado** (Crítico): Checking pendente além do limite configurado (padrão: 24h).
- **SLA em risco** (Aviso): Checking se aproximando do limite (padrão: 12h).
- **Reincidência** (Aviso): Checking que já foi reprovado e reenviado múltiplas vezes.
- **Fila acumulada** (Info): Fornecedor com muitos checkings pendentes.
- **Pico de volume** (Info): Dia com volume muito acima da média (1.8x).

### Configuração
- **Limites de SLA**: Personalizáveis por usuário (horas para alerta e para breach).
- **Regras de reincidência**: Número mínimo de reenvios para disparar alerta.
- **Filtros**: Ver por severidade (crítico/aviso/info) ou todos.

---

## 7. Fornecedores

Diretório completo de todos os veículos/fornecedores.

### Informações por fornecedor
- Total de checkings enviados.
- Taxa de aprovação / reprovação.
- SLA médio de resposta.
- Quantidade de reincidências.

### Funcionalidades
- **Busca**: Filtrar por nome do fornecedor.
- **Ordenação**: Por volume, taxa de reincidência, SLA ou nome.
- **Drawer de detalhes**: Clique em um fornecedor para ver todos os checkings dele, com opção de abrir revisão.

---

## 8. Relatórios

Análise e exportação de dados consolidados.

### Exportações disponíveis
- **CSV**: Planilha com todos os dados filtrados.
- **PDF**: Relatório visual com métricas, gráficos e distribuições.

---

## 9. Usuários (Admin)

Gestão de acesso ao painel.

### Funcionalidades
- **Adicionar usuário**: Nome, email, senha, perfil (admin/analyst/viewer).
- **Alterar perfil**: Promover ou rebaixar permissões.
- **Ativar/desativar**: Bloquear acesso sem excluir o cadastro.
- **Visualização**: Tabela ou cards com última atividade, status online.

---

## 10. Operações (Admin)

Painel técnico de arquitetura e segurança.

### Informações
- Status dos endpoints (n8n, BigQuery, Drive).
- Logs de segurança e alertas.
- Configurações do sistema.

---

## 11. Automações (Admin)

Gestão de regras automatizadas e workflows.

### Funcionalidades
- Visualização das automações configuradas no n8n.
- Regras de processamento e validação.

---

## 12. Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+K` ou `/` | Abrir busca rápida |
| `?` | Abrir painel de ajuda |
| `X` | Alternar densidade (compacto/regular/confortável) |
| `T` | Iniciar triagem em sequência |
| `G` + `D` | Ir para Dashboard |
| `G` + `A` | Ir para Aprovações |
| `G` + `L` | Ir para Alertas |
| `G` + `P` | Ir para Produção |
| `Esc` | Fechar modal/busca |

---

## 13. Busca Rápida (Command Palette)

Pressione `Ctrl+K` para abrir a busca global. Permite:
- Buscar checkings por PI, cliente ou veículo.
- Navegar diretamente para qualquer tela.
- Resultados aparecem em tempo real conforme digita.

---

## 14. Modos de Visualização

Algumas telas oferecem modos diferentes:
- **Tabela**: Dados em formato de planilha com colunas ordenáveis.
- **Cards**: Cartões visuais com informações resumidas.
- **Resumido**: Versão compacta do Dashboard com KPIs em linha única.

---

## 15. Dados em Tempo Real

- Os dados são carregados do backend (n8n + BigQuery) ao fazer login.
- **Atualização automática**: A cada 30 segundos o painel verifica novos dados.
- **Heartbeat**: Indica ao sistema que o usuário está online.
- **Usuários online**: Mostra quem está conectado ao painel no momento.
