# Arquitetura do Sistema

## Visão Geral
O Painel de Aprovação é uma aplicação web Vanilla JS que se comunica com um backend n8n via webhooks REST. A autenticação é feita via JWT.

## Estrutura de Pastas
```
painel-aprovacao/
├── index.html              # Entry point — redireciona para src/pages/
├── README.md               # Documentação principal do projeto
├── docs/                   # Documentação técnica detalhada
│   └── ARCHITECTURE.md     # Este arquivo
├── src/
│   ├── assets/img/         # Logotipos e imagens
│   ├── components/         # Componentes JS reutilizáveis
│   │   └── Header.js       # Header dinâmico com navegação
│   ├── pages/              # Páginas HTML do sistema
│   │   ├── index.html      # Login / Registro
│   │   ├── dashboard.html  # Dashboard com KPIs e Gráficos
│   │   ├── aprovacoes.html # Tabela de aprovações
│   │   └── usuarios.html   # Gestão de usuários
│   ├── scripts/            # Lógica de negócios
│   │   ├── api.js          # Cliente HTTP centralizado (JWT)
│   │   ├── auth.js         # Autenticação e sessão
│   │   ├── approvals.js    # CRUD de aprovações
│   │   ├── charts.js       # Gráficos SVG customizados
│   │   ├── dashboard.js    # Orquestrador do dashboard
│   │   ├── users.js        # Gestão de usuários
│   │   ├── pdf-export.js   # Geração de relatórios PDF
│   │   ├── easter-egg.js   # Easter eggs interativos
│   │   └── main.js         # Inicializador central da app
│   └── styles/
│       └── styles.css      # CSS global do sistema
```

## Fluxo de Dados
```
Browser → API.call(action, body)
       → POST https://n8n.grupoom.com.br/webhook/painel-aprovacao
       → n8n processa a action
       → Retorna JSON
       → Módulos JS atualizam a DOM
```

## Módulos JavaScript

| Módulo | Responsabilidade |
|---|---|
| `api.js` | Wrapper fetch com JWT, ponto único de comunicação com backend |
| `auth.js` | Sessão, logout, verificação de token expirado |
| `dashboard.js` | Inicialização, KPIs, filtros temporais, auto-refresh |
| `charts.js` | Renderização de gráficos SVG (donut, area, barras) |
| `approvals.js` | Tabela de checkings, filtros, paginação, audit log |
| `users.js` | Lista de usuários, alteração de role/status |
| `pdf-export.js` | Geração de PDF de auditoria via jsPDF |
| `Header.js` | Componente Header reutilizável injetado via `main.js` |
| `main.js` | Orquestrador — detecta a página via `data-page` e inicializa módulos |

## Autenticação
- Login via email/senha → backend retorna JWT
- Token armazenado em `localStorage` (`painel_token`)
- Cada request inclui `Authorization: Bearer <token>`
- Token expirado → redirect automático para login

## Tema
- Suporte a dark/light mode via atributo `data-theme` no `<html>`
- Preferência salva em `localStorage` (`painel_theme`)
- CSS usa variáveis customizadas (`--text-primary`, `--panel-dark`, etc.)
