// main.jsx — Vite entry point
// Importa React/ReactDOM como ES Modules (elimina CDN + Babel in-browser)
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';

// CSS
import './styles/core.css';
import './styles/components.css';

// Expõe React globalmente (os componentes usam React.useState etc sem import)
window.React = React;
window.ReactDOM = ReactDOM;
window.THREE = THREE;

// Core (ordem importa: data → helpers → intelligence → rules)
import './core/data.js';
import './core/helpers.js';
import './core/intelligence.js';
import './core/rules.js';

// API client
import PainelAPI from '../lib/api.js';
window.PainelAPI = PainelAPI;
window.dispatchEvent(new Event('painel-api-ready'));

// Components (expõem para window via Object.assign)
import './components/ui.jsx';
import './components/viz.jsx';
import './components/copilot.jsx';
import './components/shader-login.jsx';
// REQ 1 (01/07): filtros estilo Sheets por coluna
import './components/column-filter.jsx';

// Screens (expõem para window via window.Screen*)
import './screens/login.jsx';
import './screens/dashboard.jsx';
import './screens/approvals.jsx';
import './screens/producao.jsx';
import './screens/review.jsx';
import './screens/comprovante.jsx';

import './screens/triage.jsx';
import './screens/alerts.jsx';
import './screens/reports.jsx';
import './screens/users.jsx';
import './screens/operations.jsx';
import './screens/fornecedores.jsx';
import './screens/automacoes.jsx';

// Shell raiz
import './app.jsx';
