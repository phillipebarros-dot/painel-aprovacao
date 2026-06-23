// app.jsx — Shell: sidebar, topbar, palette, atalhos, roteamento
const { useState: aUseState, useEffect: aUseEffect, useRef: aUseRef, useMemo: aUseMemo, useCallback: aUseCallback } = React;

function buildAuditLog(checkings) {
  return checkings.filter(c => c.approvedAt || c.rejectedAt).map(c => ({
    id: c.submission_id + "_" + c.status, user_name: c.approval_user || "Sistema",
    verb: c.status === "approved" ? "aprovou" : "reprovou", target_pi: c.n_pi, status: c.status,
    ts: c.approvedAt || c.rejectedAt, cliente: c.cliente,
  })).sort((a, b) => b.ts - a.ts).slice(0, 30);
}
function buildNotifs(checkings) {
  const now48h = Date.now() - 48 * 3600000;
  return checkings.filter(c => (c.approvedAt > now48h) || (c.rejectedAt > now48h) || (c.submittedAt > now48h && c.status === "pending"))
    .map(c => {
      const base = { id: "n" + c.submission_id, pi: c.n_pi, cliente: c.cliente, who: (c.approval_user || "").split(" ")[0] };
      if (c.status === "approved") return { ...base, type: "approval", title: "Aprovado", ts: c.approvedAt };
      if (c.status === "rejected") return { ...base, type: "rejection", title: "Reprovado", ts: c.rejectedAt };
      return { ...base, type: "new", title: "Novo checking", ts: c.submittedAt };
    }).sort((a, b) => b.ts - a.ts).slice(0, 20);
}

// ── Sidebar ──
function Sidebar({ route, onNav, user, onLogout, pending, alertCount, alertCrit }) {
  const base = [{ key: "dashboard", label: "Dashboard", icon: "dashboard", desc: "Visão operacional geral" }, { key: "approvals", label: "Aprovações", icon: "approvals", badge: pending, desc: "Fila de checking" }, { key: "producao", label: user.role === "admin" ? "Produção" : "Minhas tarefas", icon: "target", desc: user.role === "admin" ? "Demanda e produtividade" : "Minha fila do dia" }, { key: "alerts", label: "Alertas", icon: "warn", badge: alertCount, crit: alertCrit, desc: "Monitoramento de SLA" }, { key: "fornecedores", label: "Fornecedores", icon: "store", desc: "Diretório e avaliação" }, { key: "reports", label: "Relatórios", icon: "reports", desc: "Análise e exportação" }];
  const admin = [{ key: "users", label: "Usuários", icon: "users", desc: "Gestão de acesso" }, { key: "automacoes", label: "Automações", icon: "bolt", desc: "Regras e workflows" }, { key: "operations", label: "Operações", icon: "operations", desc: "Arquitetura e segurança" }];
  const all = user.role === "admin" ? [...base, ...admin] : base;
  const roleLabel = { admin: "Admin", analyst: "Analyst", viewer: "Viewer de mídia" }[user.role] || user.role;
  const active = all.find(it => it.key === route) || all[0];
  return (
    <>
      {/* Camada 1: rail de ícones */}
      <aside className="rail">
        <div className="rail-brand" title="Grupo OM"><div className="brand-mark"><img src="assets/img/logo-grupoom.png" alt="Grupo OM"/></div></div>
        <div className="rail-nav">
          <div className="rail-label-gap"/>
          {base.map(it => (
            <button key={it.key} data-label={it.label} className={"rail-item " + (route === it.key ? "active" : "")} onClick={() => onNav(it.key)} title={it.label}>
              <Icon name={it.icon}/>{it.badge > 0 && <span className={"rail-badge " + (it.crit ? "red" : "amber")}/>}
            </button>
          ))}
          {user.role === "admin" && <div className="rail-label-gap"/>}
          {user.role === "admin" && admin.map(it => (
            <button key={it.key} data-label={it.label} className={"rail-item " + (route === it.key ? "active" : "")} onClick={() => onNav(it.key)} title={it.label}>
              <Icon name={it.icon}/>
            </button>
          ))}
        </div>
        <div className="rail-foot">
          <button className="rail-item" data-label="Sair" title="Sair" onClick={onLogout}><Icon name="logout"/></button>
          <Avatar user={user} online={true} size={30}/>
        </div>
      </aside>

      {/* Camada 2: painel de detalhe */}
      <aside className="nav-panel">
        <div className="nav-panel-head">
          <div className="brand-name"><span className="a">Grupo OM</span><span className="b">Painel · Checking</span></div>
        </div>
        <div className="nav-panel-section">
          <div className="nav-label">Operação</div>
          {base.map(it => (
            <div key={it.key} className={"panel-item " + (route === it.key ? "active" : "")} onClick={() => onNav(it.key)}>
              <Icon name={it.icon} size={15}/>
              <div className="panel-item-body"><span className="panel-item-label">{it.label}</span><span className="panel-item-desc">{it.desc}</span></div>
              {it.badge > 0 && <span className={"nav-badge " + (it.crit ? "red" : route !== it.key ? "amber" : "")}>{it.badge}</span>}
            </div>
          ))}
        </div>
        {user.role === "admin" && (
          <div className="nav-panel-section">
            <div className="nav-label">Administração</div>
            {admin.map(it => (
              <div key={it.key} className={"panel-item " + (route === it.key ? "active" : "")} onClick={() => onNav(it.key)}>
                <Icon name={it.icon} size={15}/>
                <div className="panel-item-body"><span className="panel-item-label">{it.label}</span><span className="panel-item-desc">{it.desc}</span></div>
              </div>
            ))}
          </div>
        )}
        <div className="nav-panel-foot">
          <div className="user-chip" onClick={onLogout} title="Sair">
            <Avatar user={user} online={true}/>
            <div className="user-chip-body"><span className="user-chip-name">{(user.nome || user.name || "").split(" ").slice(0, 2).join(" ")}</span><span className="user-chip-role">{roleLabel}</span></div>
            <Icon name="logout" size={15} className="logout-ico"/>
          </div>
          <div className="tas-sign nav-tas" title="Desenvolvido pelo TAS"><span>Desenvolvido pelo TAS</span><img src="assets/img/goosewhite.png" alt="" className="tas-goose"/></div>
        </div>
      </aside>
    </>
  );
}

// ── Online strip ──
function OnlineStrip({ users }) {
  const [hover, setHover] = aUseState(null);
  // Enriquece usuarios online com avatar de MOCK.users (que ja tem foto Google)
  const enriched = aUseMemo(() => {
    const byEmail = {};
    (window.MOCK?.users || []).forEach(u => { if (u.email) byEmail[u.email.toLowerCase()] = u; });
    return users.map(u => {
      const full = byEmail[(u.email || '').toLowerCase()];
      return { ...u, avatar: u.avatar || full?.avatar || null, name: u.name || u.nome || full?.name || u.email };
    });
  }, [users]);
  const visible = enriched.slice(0, 7);
  const overflow = enriched.length - visible.length;
  return (
    <div className="row gap-2" style={{ position: "relative" }}>
      <div className="online-strip" onMouseLeave={() => setHover(null)}>
        {visible.map((u, i) => (
          <span key={u.email || i} onMouseEnter={() => setHover(u)} style={{ display: "inline-flex", position: "relative" }}>
            <Avatar user={{ nome: u.name, avatar: u.avatar, color: u.color || "#0E7490" }} size={26}/>
            <span style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: 99, background: "#22c55e", border: "2px solid var(--bg)", zIndex: 2 }}/>
          </span>
        ))}
        {overflow > 0 && <span style={{ marginLeft: -8, width: 26, height: 26, borderRadius: 99, background: "var(--surface-3)", color: "var(--ink-2)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, boxShadow: "0 0 0 2px var(--bg)" }}>+{overflow}</span>}
      </div>
      <span className="online-strip-label"><b>{enriched.length}</b> online</span>
      {hover && <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: "var(--surface)", border: "1px solid var(--rule-strong)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: "var(--ink-2)", boxShadow: "var(--shadow-md)", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 30 }}><div style={{ color: "var(--ink)", fontWeight: 500, marginBottom: 2 }}>{hover.name || hover.email}</div><div className="row gap-2"><span style={{ width: 6, height: 6, borderRadius: 99, background: "#22c55e" }}/>online agora</div></div>}
    </div>
  );
}

// ── Notifications dropdown ──
function NotificationsDropdown({ notifications, onClose, onNav }) {
  const [items, setItems] = aUseState(() => (notifications || []).map(n => ({ ...n, unread: true })));
  const [tab, setTab] = aUseState("all");
  const unread = items.filter(i => i.unread).length;
  const ref = aUseRef(null);
  aUseEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); }; setTimeout(() => document.addEventListener("mousedown", h), 0); return () => document.removeEventListener("mousedown", h); }, []);
  const dotColor = { approval: "var(--accent)", rejection: "var(--alert)", new: "var(--info)" };
  const shown = tab === "unread" ? items.filter(i => i.unread) : items;
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const groups = [["Hoje", shown.filter(n => n.ts >= todayMs)], ["Anteriores", shown.filter(n => n.ts < todayMs)]];
  const markRead = (id) => setItems(items.map(it => it.id === id ? { ...it, unread: false } : it));

  return (
    <div ref={ref} className="dropdown notif-pop" style={{ top: 54, right: 24, width: 396, padding: 0 }}>
      <div className="notif-head">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="row gap-2"><h2 className="h2" style={{ fontSize: 14 }}>Notificações</h2>{unread > 0 && <span className="notif-count">{unread}</span>}</div>
          <button className="notif-mark" disabled={unread === 0} onClick={() => setItems(items.map(i => ({ ...i, unread: false })))}>Marcar lidas</button>
        </div>
        <div className="notif-tabs">
          <button className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>Tudo</button>
          <button className={tab === "unread" ? "on" : ""} onClick={() => setTab("unread")}>Não lidas{unread > 0 ? ` · ${unread}` : ""}</button>
        </div>
      </div>
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {shown.length === 0 && <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>{tab === "unread" ? "Tudo lido por aqui." : "Nenhuma notificação"}</div>}
        {groups.map(([label, list]) => list.length === 0 ? null : (
          <div key={label}>
            <div className="notif-group">{label}</div>
            {list.map(n => (
              <button key={n.id} className="notif-row" data-unread={n.unread ? "1" : "0"} onClick={() => markRead(n.id)}>
                <span className="notif-dot" style={{ background: n.unread ? dotColor[n.type] : "transparent", borderColor: dotColor[n.type] }}/>
                <div className="notif-body">
                  <div className="notif-line"><span className="notif-title">{n.title}</span><span className="notif-cli">{n.cliente}</span></div>
                  <div className="notif-meta"><span className="cell-pi">{n.pi}</span>{n.who && <span className="muted"> · {n.who}</span>}</div>
                </div>
                <time className="notif-time">{window.H.fmtRelTime(n.ts)}</time>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="notif-foot"><button className="row gap-2" onClick={() => { onClose(); onNav("alerts"); }}>Abrir central de alertas <Icon name="arrow_right" size={11}/></button></div>
    </div>
  );
}

// ── Command palette ──
function SearchPalette({ checkings, onSelect, onNav, onClose }) {
  const [q, setQ] = aUseState("");
  const [sel, setSel] = aUseState(0);
  const inputRef = aUseRef(null); const listRef = aUseRef(null); const backdropRef = aUseRef(null);
  aUseEffect(() => { inputRef.current?.focus(); }, []);
  aUseEffect(() => { const h = (e) => { if (e.target === backdropRef.current) onClose(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [onClose]);
  const navCmds = [{ t: "Ir para Dashboard", r: "dashboard", i: "dashboard" }, { t: "Ir para Aprovações", r: "approvals", i: "approvals" }, { t: "Ir para Fornecedores", r: "fornecedores", i: "store" }, { t: "Ir para Relatórios", r: "reports", i: "reports" }, { t: "Ir para Usuários", r: "users", i: "users" }, { t: "Ir para Operações", r: "operations", i: "operations" }];
  const results = aUseMemo(() => {
    if (!q.trim()) return { nav: navCmds, checks: checkings.slice(0, 6) };
    const t = q.toLowerCase();
    return { nav: navCmds.filter(c => c.t.toLowerCase().includes(t)), checks: checkings.filter(c => (c.cliente + c.n_pi + c.veiculo + c.meio + c.praca).toLowerCase().includes(t)).slice(0, 10) };
  }, [checkings, q]);
  const flat = [...results.nav.map(n => ({ kind: "nav", ...n })), ...results.checks.map(c => ({ kind: "check", c }))];
  aUseEffect(() => { setSel(0); }, [q]);
  const choose = (item) => { if (item.kind === "nav") onNav(item.r); else onSelect(item.c); onClose(); };
  const onKey = (e) => {
    if (e.key === "Escape") return onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, flat.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && flat[sel]) choose(flat[sel]);
  };
  // Bug 4.15 fix: ajuste manual de scrollTop em vez de scrollIntoView que causa saltos
  aUseEffect(() => { const list = listRef.current; const el = list?.children[sel]; if (el && list) { const et = el.offsetTop, eh = el.offsetHeight, lt = list.scrollTop, lh = list.clientHeight; if (et < lt) list.scrollTop = et; else if (et + eh > lt + lh) list.scrollTop = et + eh - lh; } }, [sel]);
  const dot = (s) => s === "approved" ? "var(--accent)" : s === "rejected" ? "var(--alert)" : "var(--warn)";
  let idx = -1;
  return (
    <div ref={backdropRef} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "14vh", backdropFilter: "blur(6px)" }}>
      <div style={{ width: "100%", maxWidth: 580, background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-lg)", overflow: "hidden", animation: "modalIn 280ms var(--ease-out)" }}>
        <div className="row gap-3" style={{ padding: "15px 18px", borderBottom: "1px solid var(--rule)" }}>
          <Icon name="search" size={16} style={{ color: "var(--ink-3)", flexShrink: 0 }}/>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Buscar checking ou navegar…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "var(--ink)", fontFamily: "var(--font-sans)" }}/>
          <span className="kbd" style={{ borderColor: "var(--rule-strong)", color: "var(--ink-3)" }}>ESC</span>
        </div>
        <div ref={listRef} style={{ maxHeight: 420, overflowY: "auto", padding: "6px 0" }}>
          {flat.length === 0 && <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Nenhum resultado</div>}
          {results.nav.length > 0 && <div style={{ padding: "6px 18px 2px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600 }}>Navegação</div>}
          {results.nav.map(n => { idx++; const i = idx; return (
            <div key={n.r} onMouseEnter={() => setSel(i)} onClick={() => choose({ kind: "nav", ...n })} className="row gap-3" style={{ padding: "9px 18px", cursor: "pointer", background: sel === i ? "var(--glass-strong)" : "transparent", color: "var(--ink-2)" }}>
              <Icon name={n.i} size={15} style={{ color: "var(--ink-3)" }}/><span style={{ fontSize: 13.5 }}>{n.t}</span>
            </div>
          ); })}
          {results.checks.length > 0 && <div style={{ padding: "8px 18px 2px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)", fontWeight: 600 }}>Checkings</div>}
          {results.checks.map(c => { idx++; const i = idx; return (
            <div key={c.submission_id} onMouseEnter={() => setSel(i)} onClick={() => choose({ kind: "check", c })} className="row gap-3" style={{ padding: "10px 18px", cursor: "pointer", background: sel === i ? "var(--glass-strong)" : "transparent" }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: dot(c.status), flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cliente}</div><div className="row gap-2" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}><span className="pi-strong">{c.n_pi}</span><span>·</span><span>{c.veiculo}</span></div></div>
              <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{c.status === "pending" ? "pendente" : c.status === "approved" ? "aprovado" : "reprovado"}</span>
            </div>
          ); })}
        </div>
        <div className="row gap-4" style={{ padding: "9px 18px", borderTop: "1px solid var(--rule)", fontSize: 11, color: "var(--ink-3)" }}><span>↑↓ navegar</span><span>↵ abrir</span><span>esc fechar</span></div>
      </div>
    </div>
  );
}

// ── Keyboard help ──
function HelpOverlay({ onClose }) {
  const shortcuts = [
    ["⌘ K", "Busca / paleta de comandos"], ["/", "Busca rápida"], ["T", "Revisar em sequência"],
    ["G depois D", "Ir para Dashboard"], ["G depois A", "Ir para Aprovações"], ["G depois L", "Ir para Alertas"],
    ["G depois R", "Ir para Relatórios"], ["A", "Aprovar (review / triagem)"], ["R", "Reprovar (review / triagem)"],
    ["S", "Pular (na triagem)"], ["?", "Esta ajuda"], ["Esc", "Fechar / voltar"], ["X", "Trocar densidade"],
  ];
  return (<>
    <div className="scrim" onClick={onClose} style={{ zIndex: 9998 }}/>
    <div className="modal content" style={{ width: "min(560px, 92vw)", zIndex: 9999 }}>
      <div className="row" style={{ justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--rule)" }}><div className="row gap-2"><Icon name="keyboard" size={16}/><h3 className="h2">Atalhos de teclado</h3></div><button className="icon-btn" onClick={onClose}><Icon name="x" size={15}/></button></div>
      <div className="card-pad"><div className="kbd-help-grid">{shortcuts.map(([k, d], i) => <div key={i} className="kbd-row"><span>{d}</span><span className="keys">{k.split(" ").map((kk, j) => <span key={j} className="kbd">{kk}</span>)}</span></div>)}</div></div>
    </div>
  </>);
}

// ── Density menu (claro, sem cara de troca de layout) ──
function DensityMenu({ density, setDensity }) {
  const [open, setOpen] = aUseState(false);
  const ref = aUseRef(null);
  aUseEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const opts = [["compact", "Compacto", "mais linhas visíveis"], ["regular", "Padrão", "equilíbrio"], ["comfy", "Amplo", "mais respiro"]];
  const cur = opts.find(o => o[0] === density) || opts[1];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="icon-btn" title="Densidade da interface" onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", width: "auto", height: 34, padding: "0 10px", gap: 6 }}>
        <Icon name="list" size={15}/><span style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{cur[1]}</span><Icon name="chevron_down" size={11}/>
      </button>
      {open && (
        <div className="dropdown" style={{ top: 42, right: 0, minWidth: 226 }}>
          <div style={{ padding: "6px 12px 5px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-4)", fontWeight: 600 }}>Densidade da interface</div>
          {opts.map(o => (
            <div key={o[0]} className="dropdown-item" onClick={() => { setDensity(o[0]); setOpen(false); }} style={{ justifyContent: "space-between" }}>
              <div className="col" style={{ gap: 1 }}><span style={{ fontWeight: density === o[0] ? 600 : 450, color: "var(--ink)" }}>{o[1]}</span><span style={{ fontSize: 11, color: "var(--ink-3)" }}>{o[2]}</span></div>
              {density === o[0] && <Icon name="check" size={14} style={{ color: "var(--accent)" }}/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Top bar ──
const ROUTE_ICONS = { dashboard: "dashboard", approvals: "approvals", producao: "target", alerts: "warn", fornecedores: "store", reports: "reports", users: "users", automacoes: "bolt", operations: "operations", review: "review" };
function TopBar({ route, user, onNav, onlineUsers, notifications, checkings, onOpenReview, density, setDensity, onHelp, onSearch, onToggleSidebar, navCollapsed, viewModes, view, onView, theme, onToggleTheme }) {
  const [notifOpen, setNotifOpen] = aUseState(false);
  const unread = notifications.length;
  const titles = { dashboard: "Dashboard", approvals: "Aprovações", review: "Review", reports: "Relatórios", users: "Usuários", operations: "Operações", fornecedores: "Fornecedores", automacoes: "Automações", producao: "Produção", alerts: "Alertas" };
  const selfIn = onlineUsers.some(u => u.email === user?.email);
  const displayUsers = selfIn ? onlineUsers : [{ name: user?.nome || user?.name, email: user?.email, color: user?.color }, ...onlineUsers];
  return (
    <div className="topbar">
      <button className="icon-btn" title={navCollapsed ? "Expandir menu" : "Recolher menu"} onClick={onToggleSidebar} style={{ marginLeft: -4 }}><Icon name="panel_left" size={16}/></button>
      <div className="row gap-2" style={{ alignItems: "center", minWidth: 90 }}>
        <img src="assets/img/om-title.png" alt="OM" className="topbar-om"/>
        <div className="h2" style={{ fontSize: 16, fontWeight: 600 }}>{titles[route] || ""}</div>
      </div>
      <div className="divider-v" style={{ height: 22 }}/>
      <OnlineStrip users={displayUsers}/>
      <div className="spacer"/>
      {user?.role === "viewer" && <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--warn)", background: "var(--warn-soft)", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(217,119,6,0.2)" }}>Somente visualização</span>}
      <button className="search-trigger" onClick={onSearch}><Icon name="search" size={14}/><span className="grow">Buscar ou navegar…</span><span className="kbd">⌘ K</span></button>
      {viewModes && <span className="tb-view"><span className="tb-view-lbl">Ver</span><Segmented value={view} onChange={onView} options={viewModes}/></span>}
      <DensityMenu density={density} setDensity={setDensity}/>
      <button className="icon-btn" title={theme === "light" ? "Tema escuro" : "Tema claro"} onClick={onToggleTheme}><Icon name={theme === "light" ? "moon" : "sun"} size={15}/></button>
      <button className="icon-btn" title="Atalhos (?)" onClick={onHelp}><Icon name="keyboard" size={15}/></button>
      <button className="icon-btn" title="Notificações" onClick={() => setNotifOpen(o => !o)}><Icon name="bell" size={15}/>{unread > 0 && <span className="dot-notif"/>}</button>
      {notifOpen && <NotificationsDropdown notifications={notifications} onClose={() => setNotifOpen(false)} onNav={onNav}/>}
    </div>
  );
}

// ── Toasts ──
function ToastItem({ toast, onClose }) {
  aUseEffect(() => { const id = setTimeout(onClose, toast.duration || 4200); return () => clearTimeout(id); }, []);
  const cls = toast.type === "error" ? "alert" : toast.type === "info" ? "info" : "";
  return <div className={"toast " + cls} onClick={toast.onClick} style={toast.onClick ? { cursor: "pointer" } : undefined}><span className="dot" style={toast.color ? { background: toast.color } : undefined}/><span>{toast.message}</span></div>;
}
function ToastStack({ toasts, onDismiss }) { return <div className="toast-stack">{toasts.map(t => <ToastItem key={t.id} toast={t} onClose={() => onDismiss(t.id)}/>)}</div>; }


// ── App ──
function App() {
  const [user, setUser] = aUseState(null);
  const [route, setRoute] = aUseState("dashboard");
  const [reviewing, setReviewing] = aUseState(null);
  const [checkings, setCheckings] = aUseState([]);
  const [onlineUsers, setOnlineUsers] = aUseState([]);
  const [toasts, setToasts] = aUseState([]);
  const [density, setDensityState] = aUseState(() => localStorage.getItem("painel_density") || "regular");
  const [theme, setTheme] = aUseState(() => localStorage.getItem("painel_theme") || "dark");
  const [navCollapsed, setNavCollapsed] = aUseState(() => localStorage.getItem("painel_nav_collapsed") === "1");
  const [pageView, setPageView] = aUseState({});
  const [searchOpen, setSearchOpen] = aUseState(false);
  const [helpOpen, setHelpOpen] = aUseState(false);
  const [triageQueue, setTriageQueue] = aUseState(null);
  const toastId = aUseRef(0);
  const gKey = aUseRef(false);


  const stats = aUseMemo(() => window.H.computeStats(checkings), [checkings]);
  const alerts = aUseMemo(() => window.AI.computeAlerts(checkings), [checkings]);
  const alertCounts = aUseMemo(() => window.AI.alertCounts(alerts), [alerts]);
  const auditLog = aUseMemo(() => buildAuditLog(checkings), [checkings]);
  const notifications = aUseMemo(() => buildNotifs(checkings), [checkings]);
  const preSuppliers = aUseMemo(() => typeof aggregateSuppliers === "function" ? aggregateSuppliers(checkings) : [], [checkings]);

  const addToast = aUseCallback((t) => { const id = ++toastId.current; setToasts(p => [...p.slice(-3), { id, ...t }]); }, []);
  const dismissToast = aUseCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  // Carrega dados reais do n8n/BigQuery
  const loadData = aUseCallback(async () => {
    try {
      await window.MOCK.loadReal();
      setCheckings(window.MOCK.checkings.map(c => ({ ...c })));
      setOnlineUsers(window.MOCK.onlineUsers || []);
    } catch (e) { addToast({ type: "error", message: "Falha ao carregar dados: " + (e.message || "servidor") }); }
  }, [addToast]);

  // Restaura sessao + carrega dados; revalida online a cada 30s
  aUseEffect(() => {
    const boot = () => {
      if (window.PainelAPI && window.PainelAPI.isLoggedIn()) {
        const u = window.PainelAPI.getUser();
        if (u) { setUser({ ...u, nome: u.name || u.email }); window.PainelAPI.startHeartbeat(); loadData(); }
      }
      window.__painelOnSessionExpired = () => { setUser(null); addToast({ type: "error", message: "Sessão expirada. Faça login novamente." }); };
    };
    if (window.PainelAPI) boot(); else window.addEventListener("painel-api-ready", boot, { once: true });
  }, [loadData, addToast]);
  aUseEffect(() => {
    if (!user) return;
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [user, loadData]);

  const setDensity = (d) => { setDensityState(d); localStorage.setItem("painel_density", d); document.documentElement.setAttribute("data-density", d); };
  const toggleTheme = () => setTheme(t => { const n = t === "light" ? "dark" : "light"; localStorage.setItem("painel_theme", n); document.documentElement.setAttribute("data-theme", n); return n; });
  const VIEW_MODES = {
    dashboard: [{ value: "completo", label: "Painel" }, { value: "resumido", label: "Foco" }],
    approvals: [{ value: "table", label: "Tabela" }, { value: "cards", label: "Cards" }, { value: "kanban", label: "Kanban" }],
    producao: [{ value: "tabela", label: "Produtividade" }, { value: "cards", label: "Cards" }, { value: "divisao", label: "Divisão por conta" }],
    alerts: [{ value: "lista", label: "Lista" }, { value: "grupos", label: "Agrupado" }],
    users: [{ value: "cards", label: "Cards" }, { value: "lista", label: "Lista" }],
    fornecedores: [{ value: "cards", label: "Cards" }, { value: "lista", label: "Lista" }],
  };
  const curModes = reviewing ? null : VIEW_MODES[route];
  const curView = (pageView[route]) || (curModes && curModes[0].value);
  const setView = (v) => setPageView(p => ({ ...p, [route]: v }));
  const toggleNav = () => setNavCollapsed(v => { localStorage.setItem("painel_nav_collapsed", v ? "0" : "1"); return !v; });
  aUseEffect(() => { document.documentElement.setAttribute("data-density", density); document.documentElement.setAttribute("data-theme", theme); }, []);

  const handleLogin = (u) => { setUser({ ...u, nome: u.name || u.email }); window.PainelAPI?.startHeartbeat(); loadData(); addToast({ type: "success", message: `Bem-vindo, ${(u.name || "usuário").split(" ")[0]}!` }); };
  const handleLogout = async () => { try { window.PainelAPI?.stopHeartbeat(); await window.PainelAPI?.logout(); } catch {} setUser(null); setRoute("dashboard"); setReviewing(null); setCheckings([]); };
  const openReview = (c) => { React.startTransition(() => setReviewing(c)); };
  const handleNav = (r) => {
    if ((r === "users" || r === "operations") && user?.role !== "admin") { addToast({ type: "error", message: "Acesso restrito a admins." }); return; }
    React.startTransition(() => { setRoute(r); setReviewing(null); });
  };
  const startTriage = (queue) => {
    if (user?.role === "viewer") { addToast({ type: "error", message: "Sem permissão para decidir." }); return; }
    const q = (Array.isArray(queue) && queue.length ? queue.slice() : checkings.filter(c => window.H.norm(c.status) === "pending")).sort((a, b) => a.submittedAt - b.submittedAt);
    if (!q.length) { addToast({ type: "info", message: "Nenhum checking pendente na fila." }); return; }
    setReviewing(null); setTriageQueue(q);
  };
  const handleDecide = (checking, decision, reason, silent) => {
    if (user?.role === "viewer") { addToast({ type: "error", message: "Sem permissão para decidir." }); return; }
    const now = Date.now();
    if (decision === "revert") {
      const who = user.nome || user.name;
      window.PainelAPI?.updateCheckingStatus(checking.submission_id, "pending", who).catch(err => addToast({ type: "error", message: "Falha ao reabrir: " + (err.message || "") }));
      setCheckings(prev => prev.map(c => c.submission_id === checking.submission_id ? { ...c, status: "pending", approvedAt: null, rejectedAt: null, rejection_reason: "", decision_label: "" } : c));
      addToast({ type: "info", message: `${checking.n_pi} reaberto. Voltou para a fila.` });
      setReviewing(null); return;
    }
    const isApprove = decision === "approve" || decision === "ressalva";

    const label = decision === "ressalva" ? "Aprovado com sugestões" : decision === "sem_checking" ? "Sem checking" : "";
    const who = user.nome || user.name;
    if (isApprove) window.PainelAPI?.approve(checking.submission_id, who).catch(err => addToast({ type: "error", message: "Falha ao aprovar: " + (err.message || "") }));
    else window.PainelAPI?.reject(checking.submission_id, who, reason || "").catch(err => addToast({ type: "error", message: "Falha ao reprovar: " + (err.message || "") }));
    setCheckings(prev => prev.map(c => c.submission_id === checking.submission_id ? { ...c, status: isApprove ? "approved" : "rejected", approvedAt: isApprove ? now : null, rejectedAt: isApprove ? null : now, approval_user: user.nome || user.name, rejection_reason: (decision === "reject" || decision === "ressalva") ? reason : "", decision_label: label } : c));
    if (!silent) {
      const msg = decision === "approve" ? `${checking.n_pi} aprovado!` : decision === "ressalva" ? `${checking.n_pi} aprovado com ressalva.` : decision === "sem_checking" ? `${checking.n_pi} marcado como sem checking.` : `${checking.n_pi} reprovado.`;
      addToast({ type: isApprove ? "success" : "info", color: isApprove ? undefined : "#ef4444", message: msg });
    }
    setReviewing(null);
  };

  // keyboard shortcuts
  aUseEffect(() => {
    if (!user) return;
    const h = (e) => {

      const tag = e.target.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); return; }
      if (typing) return;
      if (e.key === "Escape") { if (searchOpen) setSearchOpen(false); else if (helpOpen) setHelpOpen(false); else if (reviewing) setReviewing(null); return; }
      if (e.key === "?") { setHelpOpen(true); return; }
      if (e.key === "/") { e.preventDefault(); setSearchOpen(true); return; }
      if (e.key.toLowerCase() === "x") { const order = ["compact", "regular", "comfy"]; setDensity(order[(order.indexOf(density) + 1) % 3]); return; }
      if (e.key.toLowerCase() === "t" && !triageQueue && !reviewing) { startTriage(); return; }
      if (gKey.current) {
        gKey.current = false;
        const map = { d: "dashboard", a: "approvals", r: "reports", u: "users", o: "operations", l: "alerts", p: "producao" };
        if (map[e.key.toLowerCase()]) handleNav(map[e.key.toLowerCase()]);
        return;
      }
      if (e.key.toLowerCase() === "g") { gKey.current = true; setTimeout(() => { gKey.current = false; }, 800); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [user, searchOpen, helpOpen, reviewing, density, triageQueue]);

  if (!user) return <><ScreenLogin onLogin={handleLogin}/><ToastStack toasts={toasts} onDismiss={dismissToast}/></>;

  const screen = reviewing ? <ScreenReview checking={reviewing} currentUser={user} onBack={() => setReviewing(null)} onDecide={handleDecide}/>
    : route === "dashboard" ? <ScreenDashboard stats={stats} checkings={checkings} auditLog={auditLog} onOpenReview={openReview} onNavigate={handleNav} loading={false} onStartTriage={startTriage} viewMode={curView}/>
    : route === "approvals" ? <ScreenApprovals currentUser={user} checkings={checkings} stats={stats} onOpenReview={openReview} onRefresh={() => {}} onToast={addToast} onDecide={handleDecide} onStartTriage={startTriage} viewMode={curView} onSetCheckStatus={(id, sc) => { setCheckings(prev => prev.map(c => c.submission_id === id ? { ...c, statusCheck: sc } : c)); window.PainelAPI?.updateCheckingStatus(id, sc, user.nome || user.name).catch(e => addToast({ type: "error", message: "Falha ao salvar status: " + (e.message || "") })); }} onSetComentario={(id, txt) => { setCheckings(prev => prev.map(c => c.submission_id === id ? { ...c, comentario: txt } : c)); window.PainelAPI?.addComment(id, txt, user.nome || user.name).catch(e => addToast({ type: "error", message: "Falha ao salvar comentário: " + (e.message || "") })); }} onSetResponsavel={(id, who) => { setCheckings(prev => prev.map(c => c.submission_id === id ? { ...c, assigned_to: who, approval_user: c.status !== "pending" ? who : c.approval_user } : c)); window.PainelAPI?.assignResponsible(id, who, new Date().toISOString().slice(0, 7)).catch(e => addToast({ type: "error", message: "Falha ao atribuir: " + (e.message || "") })); }}/>
    : route === "alerts" ? <ScreenAlerts checkings={checkings} currentUser={user} onOpenReview={openReview} onStartTriage={startTriage} onDecide={handleDecide} onToast={addToast} viewMode={curView} preAlerts={alerts}/>
    : route === "producao" ? <ScreenProducao checkings={checkings} currentUser={user} onOpenReview={openReview} onToast={addToast} viewMode={curView} onSetCheckStatus={(id, sc) => { setCheckings(prev => prev.map(c => c.submission_id === id ? { ...c, statusCheck: sc } : c)); window.PainelAPI?.updateCheckingStatus(id, sc, user.nome || user.name).catch(e => addToast({ type: "error", message: "Falha ao salvar status: " + (e.message || "") })); }} onSetComentario={(id, txt) => { setCheckings(prev => prev.map(c => c.submission_id === id ? { ...c, comentario: txt } : c)); window.PainelAPI?.addComment(id, txt, user.nome || user.name).catch(e => addToast({ type: "error", message: "Falha ao salvar comentário: " + (e.message || "") })); }} onAssign={(map) => {
        const mes = new Date().toISOString().slice(0, 7);
        setCheckings(prev => prev.map(c => map[c.submission_id] ? { ...c, assigned_to: map[c.submission_id] } : c));
        Object.entries(map).forEach(([id, who]) => window.PainelAPI?.assignResponsible(id, who, mes).catch(() => {}));
      }}/>
    : route === "reports" ? <ScreenReports checkings={checkings} currentUser={user} onToast={addToast}/>
    : route === "users" ? <ScreenUsers onToast={addToast} viewMode={curView} checkings={checkings}/>
    : route === "operations" ? <ScreenOperations onToast={addToast} checkings={checkings}/>
    : route === "fornecedores" ? <ScreenFornecedores checkings={checkings} onOpenReview={openReview} viewMode={curView} onToast={addToast} preSuppliers={preSuppliers}/>
    : route === "automacoes" ? <ScreenAutomacoes onToast={addToast}/>
    : <ScreenDashboard stats={stats} checkings={checkings} auditLog={auditLog} onOpenReview={openReview} onNavigate={handleNav} loading={false}/>;

  return (
    <>
      <div className={"app" + (navCollapsed ? " nav-collapsed" : "")}>
        <Sidebar route={reviewing ? "review" : route} onNav={handleNav} user={user} onLogout={handleLogout} pending={stats.pending} alertCount={alertCounts.total} alertCrit={alertCounts.critical > 0}/>
        <div className="content">
          <TopBar route={reviewing ? "review" : route} user={user} onNav={handleNav} onlineUsers={onlineUsers} notifications={notifications} checkings={checkings} onOpenReview={openReview} density={density} setDensity={setDensity} theme={theme} onToggleTheme={toggleTheme} onHelp={() => setHelpOpen(true)} onSearch={() => setSearchOpen(true)} onToggleSidebar={toggleNav} navCollapsed={navCollapsed} viewModes={curModes} view={curView} onView={setView}/>
          {screen}
        </div>
      </div>
      {searchOpen && <SearchPalette checkings={checkings} onSelect={openReview} onNav={handleNav} onClose={() => setSearchOpen(false)}/>}
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)}/>}
      {triageQueue && <ScreenTriage queue={triageQueue} currentUser={user} onDecide={(c, d, r) => handleDecide(c, d, r, true)} onClose={() => setTriageQueue(null)}/>}

      <ToastStack toasts={toasts} onDismiss={dismissToast}/>
    </>
  );
}

// Error Boundary: captura crashes do React (ex: extensões que alteram o DOM)
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) {
    // Silenciar erros de extensões (content_script, childNodes null)
    if (err?.message?.includes('childNodes') || err?.message?.includes('removeChild')) return;
  }
  render() {
    if (this.state.hasError) return React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#b0b5be' } },
      React.createElement('h2', null, 'Algo deu errado'),
      React.createElement('p', null, 'Uma extensão do navegador pode ter interferido.'),
      React.createElement('button', { onClick: () => window.location.reload(), className: 'btn btn-accent', style: { marginTop: 16 } }, 'Recarregar')
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(AppErrorBoundary, null, React.createElement(App)));
