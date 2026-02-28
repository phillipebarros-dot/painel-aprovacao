#  Enciclopédia e Guia do Usuário Definitivo — Painel de Aprovação (Grupo OM)

> **Documento Oficial — Confidencial e de Uso Interno**
> *Desenvolvido e documentado integralmente por Eru.*

Bem-vindo à Enciclopédia Oficial do **Painel de Aprovação do Grupo OM**. Este documento é o guia definitivo, desenhado para cobrir de forma exaustiva e robusta absolutamente todos os recursos, fluxos lógicos e processos operacionais do sistema. Se você é um Analista, um Administrador ou um novo colaborador do Mídia, este guia tem a resposta para qualquer dúvida.

---

## Índice

1. [O Que é o Sistema? (Contexto e Arquitetura)](#1-o-que-é-o-sistema)
2. [Acesso, Autenticação e Primeiros Passos](#2-acesso-autenticação-e-primeiros-passos)
3. [Níveis de Acesso: A Hierarquia (Admin vs Analista)](#3-níveis-de-acesso)
4. [Visão Macro: O Dashboard Dinâmico](#4-visão-macro-o-dashboard-dinâmico)
5. [O Core Engine: Painel de Aprovação e Fluxo de Review](#5-o-core-engine-painel-de-aprovação-e-fluxo-de-review)
6. [Módulo de Relatórios e Exportação em PDF (Inteligência de Negócios)](#6-módulo-de-relatórios)
7. [Gestão de Pessoas: A Aba de Usuários](#7-gestão-de-pessoas)
8. [Perguntas Frequentes (FAQ)](#8-faq)

---

## 1. O Que é o Sistema?

O Painel de Aprovação nasceu da necessidade de centralizar, auditar e agilizar a verificação massiva de materiais (checkings) do departamento de Mídia do Grupo OM.

Historicamente, conferir prints de campanhas, fotos de outdoors ou comprovações de veiculação na TV era um processo doloroso e manual. Este sistema foi construído para funcionar como um **hub central de operações**. 
Por baixo dos panos, ele é alimentado por um poderoso cérebro de automações chamado **n8n**, que se conecta nativamente com o **Google BigQuery** (para armazenar dados de forma imutável), o **Google Drive** (para hospedagem das fotos/evidências) e serviços de **SMTP** (para enviar e-mails automatizados aos veículos ou fornecedores em caso de reprovação).

---

## 2. Acesso, Autenticação e Primeiros Passos

O sistema é protegido por tokens de segurança militar (JWT - HMAC-SHA256). Nenhuma página funciona se você não estiver devidamente autenticado.

### Como Logar
- Acesse a URL raiz do sistema.
- Insira seu `E-mail Corporativo` e sua `Senha`.
- O sistema validará se seu cadastro está "Ativo". Caso você tenha sido inativado por um administrador, o acesso será sumariamente negado.

### Como se Cadastrar (Onboarding)
- Na tela de login, clique em **Criar nova conta**.
- Preencha seus dados reais: **Nome Completo**, **E-mail**, **Senha**, e **Grupo de Usuário**.
- O *Grupo de Usuário* é fundamental (Opções: Mídia, Criação, Atendimento, Planejamento, Outros). É isso que nos ajuda a saber qual braço da agência está aprovando materiais.
- **Importante:** Todo novo cadastro nasce com o status de `Analyst` (Analista). Promoções para `Admin` devem ser requisitadas aos gestores que já estão na plataforma.

---

## 3. Níveis de Acesso (A Hierarquia do Sistema)

A plataforma baseia-se em um rigoroso controle de papéis (RBAC - Role Based Access Control) que opera tanto visualmente no seu navegador quanto dezenas de vezes por segundo no banco de dados do Google.

### O Analista (Analyst)
Perfil focado em produtividade e operação bruta.
- **O que faz:** Visualiza o Dashboard numérico, acessa o Painel de Aprovação completo, faz vistorias lógicas dos materiais (Aprovar/Reprovar), e visualiza os anexos do veículo.
- **O que NÃO faz:** Não acessa o Módulo Estendido de Relatórios (aba oculta para ele) e não tem acesso de leitura/escrita à Aba de Equipe (Usuários). Se ele tentar forçar a URL de usuários, o Firewall do backend travará a requisição (Retorna `Erro 403 Forbidden`).

### O Administrador (Admin)
O gestor da plataforma. Têm poder absoluto para auditar a agência.
- **O que faz:** Faz tudo o que o Analista faz. Além disso, tem acesso pleno à aba de **Relatórios Avançados** (podendo extrair PDFs com a logo da agência contendo métricas sensíveis como Taxa de Reenvio), e detém a chave geral na aba **Usuários**, onde pode promover analistas, rebaixar administradores ou cortar permanentemente (Inativar/Ativar) conexões de funcionários.

---

## 4. Visão Macro: O Dashboard Dinâmico

O Dashboard é a tela de "Boas-Vindas". Seu objetivo é prover resposta cerebral em 2 segundos sobre a saúde do departamento de Mídia.

- **Os 4 Grandes KPIs:** Mostram no topo os totais do dia/semana de materiais recebidos, a fila dramática de "Pendentes" aguardando vistoria da equipe, os já Aprovados e os Reprovados.
- **Gráficos em Tempo Real (Charts):** Dois gráficos essenciais mostram a performance em "Pizza" (aprovados vs rejeitados vs fila) e "Barras" (qual veículo está enviando mais material pra provar que rodou a campanha).
- **Log On-Screen (Live Audit):** No final da página há um pequeno painel semelhante a um terminal hacker. Ele pisca e atualiza em tempo real as atividades, mostrando *quem* aprovou *o que* e a que *horas*.

---

## 5. O Core Engine: Painel de Aprovação e Fluxo de Review

Esta é a página mais importante do ecossistema. É aqui que você, como auditor do Grupo OM, validará se o PIX, a Foto, o Outdoor ou a Inserção na TV e Rádio realmente ocorreram conforme o contrato.

### A. Tabela Dinâmica
Uma tabela listando todas submissões.
- **Campos Visíveis:** Número do PI, Cliente (Anunciante), Veículo, Meio de Comunicação, Responsável e Ação.
- **Filtros e Busca:** No canto superior direito da tabela há uma barra de busca vitalícia e abas para você focar apenas em focar sua tabela em `Pendentes`, `Aprovados` ou `Geral`.
- **Botões Rápidos:** Na última coluna, há atalhos diretos. Clicar no link do Drive abre a pasta nativa do Google com o material original, e o botão `Review` o leva à ficha técnica.

### B. A Ficha Técnica (A Tela de Review)
Quando você entra no "Review" de uma linha:
1. **Dados Construtivos (Esquerda):** O sistema isola os dados do Anunciante e do Veículo em modo "somente leitura" com visual hi-tech para checagem com o contrato do PI.
2. **O Trunfo — Evidências Visuais (Centro):** Em vez de obrigar o analista a abrir o Google Drive, o backend (`n8n_workflow`) extraiu todas as fotos de comprovação de dentro da nuvem do Google e injetou dinamicamente em formato de galeria aqui no centro da tela. Você avalia a foto no próprio painel!
3. **Decisão Binária (Baixo):**
   - 🟢 **Bater o Martelo (Aprovar):** Um clique rápido. O status é alterado na nuvem, registra seu nome com carimbo de milissegundos, e volta para a tabela.
   - 🔴 **Punir e Recusar (Reprovar):** Se a foto do outdoor está ruim, ou a hora da TV não bate, você clica aqui. O sistema forçará você a preencher um **Motivo**, bloqueando recusas silenciosas. Quando confirmado, a mágica do backend envia **um e-mail automático do servidor do Grupo OM** parando o fornecedor para conserto, entregando a ele a sua justificativa e dados do PI!

---

## 6. Módulo de Relatórios e Extração Oficial (Admin)

Disponível para diretores e lideranças. Esta página possui os dados finos que guiam a agência:
- **A Máquina do Tempo:** Permite puxar e cruzar milhares de linhas em instantes. Você pode ver todos os registros da Semana, do Mês atual, do Ano inteiro ou Todo o Histórico.
- **Abas Cruzadas:** Filtre todos de um ano E que sejam "Aprovações", ou foque em "PI Enviado" e "Complemento".
- **Refino Criptografado (Métricas Novas):** 
  - **Novos Envios** vs **Complementos:** Avalia retrabalho.
  - **Taxa de Reenvio:** Quantos % dos veículos estão precisando refazer o checking. Se isso estiver alto, o veículo está trabalhando mal.
  - **Top Veículos & Meio:** Analítica de qual emissora ou outdoor domina seu volume no período.
- **Exportação Master (O PDF Oficial):** Clicar em exportar gera na máquina do usuário um PDF vetorial brutalmente profissional. Este PDF carrega o Cabeçalho Colorido Oficial do **Grupo OM**, incorpora com fidelidade as métricas ativas na tela (incluindo Taxa de Reenvio), expõe e formata toda a tabela em linhas coloridas e secciona perfeitamente as quebras de página num formato de relatório executivo aprovável em reunião de diretoria.

---

## 7. Gestão de Equipe (Admin)

Página de segurança operacional `/usuarios.html`.
- Você visualiza a foto de perfil (ícone) e o grupo operacional (`Mídia`, `Atendimento` etc) de cada funcionário logado.
- Os cards são divididos entre quem tem poder total (`Administrador`) e quem é força de trabalho (`Analista`).
- **Comando "Role":** Na engrenagem, o admin seleciona se aquela pessoa sobe de cargo ou desce. A mutação é atômica, refletindo no próximo clique do usuário na plataforma.
- **Comando "Status" (Kill-Switch):** Em vez de deletar o banco de dados e apagar o rastro das operações passadas que este ex-funcionário aprovou (o que quebraria as métricas históricas), use o botão "Status". Transforme "Active" em "Inactive". Instantaneamente, todas as sessões dele são dilaceradas (o *token expiration validator* recusa as assinaturas) e ele não entra mais, preservando seu histórico intacto na base de dados (BigQuery).

---

## 8. FAQ e Dicas

- **Esqueci a Senha:** Peça a um administrador para checar seu e-mail de registro (em breve, fluxo de self-service será adicionado).
- **O Painel está Negro/Branco:** O sistema inteiro possui suporte fluído ao *Dark Mode* e *Light Mode*. Alterne o design clicando no ícone do sol/lua no canto superior direito de qualquer página!
- **As Thumbs Não Apareceram na Review:** Quando ocorre sobrecarga severa no motor do Google Drive ou restrições de link externo público na partição original dos checkings, o sistema mostrará um aviso. Use, nestes casos, o botão direto de acessar o drive paralelamente.

---
> **Grupo OM | Painel de Aprovação** • *Desenvolvimento Intelectual: Eru*
