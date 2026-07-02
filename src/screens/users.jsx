// screen-users.jsx -> window.ScreenUsers
function InviteModal({ onClose, onSuccess }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("viewer");
  // REQ 6.4 (01/07): grupo de acesso por usuario
  const [grupo, setGrupo] = React.useState("boticario");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const submit = (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!name.trim() || !email.trim() || !password.trim()) { setError("Preencha todos os campos obrigatórios."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email inválido."); return; }
    if (password.length < 6) { setError("Senha deve ter pelo menos 6 caracteres."); return; }
    setSaving(true);
    /* FIX B2.6: submit nao persiste no backend (setTimeout fake). Rotulo explicita cadastro local */
    setTimeout(() => { setSaving(false); setSuccess(`Usuário ${name.trim()} cadastrado localmente!`); setTimeout(() => { onSuccess({ name: name.trim(), email: email.trim().toLowerCase(), role, grupo }); onClose(); }, 1000); }, 800);
  };

  const Lbl = ({ children }) => <label style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-2)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</label>;
  return (
    <div className="scrim content" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ display: "grid", placeItems: "center", zIndex: 9999 }}>
      <div style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 440, boxShadow: "var(--shadow-lg)", overflow: "hidden", animation: "modalIn 360ms var(--ease-out)" }}>
        <div className="row" style={{ justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--rule)" }}>
          <div><div className="eyebrow" style={{ marginBottom: 4 }}>Admin</div><h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Convidar Usuário</h3></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={15}/></button>
        </div>
        <form onSubmit={submit} style={{ padding: "20px 24px 24px" }}>
          <div className="col" style={{ gap: 14 }}>
            <div className="col" style={{ gap: 5 }}><Lbl>Nome completo *</Lbl><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Victor Sequinel" autoFocus/></div>
            <div className="col" style={{ gap: 5 }}><Lbl>Email corporativo *</Lbl><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="victor@grupoom.com.br"/></div>
            <div className="col" style={{ gap: 5 }}><Lbl>Senha temporária *</Lbl><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/></div>
            <div className="col" style={{ gap: 5 }}><Lbl>Permissão</Lbl>
              <select className="input" value={role} onChange={e => setRole(e.target.value)}><option value="viewer">Viewer · so consulta</option><option value="analyst">Analyst · aprova e reprova</option><option value="admin">Admin · acesso total</option></select>
            </div>
            {/* REQ 6.4 (01/07): grupo de acesso */}
            <div className="col" style={{ gap: 5 }}><Lbl>Grupo de acesso</Lbl>
              <select className="input" value={grupo} onChange={e => setGrupo(e.target.value)}><option value="boticario">Equipe Anne (Boticario)</option><option value="kauana">Equipe Kauane (Uninter)</option><option value="todos">Todos (admin)</option><option value="nao_definido" disabled>Nao definido</option></select>
            </div>
          </div>
          {error && <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--alert-soft)", color: "var(--alert)", borderRadius: 10, fontSize: 13, display: "flex", gap: 8, alignItems: "center", border: "1px solid color-mix(in srgb, var(--alert) 25%, transparent)" }}><Icon name="warn" size={14}/> {error}</div>}
          {success && <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 10, fontSize: 13, display: "flex", gap: 8, alignItems: "center", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}><Icon name="check" size={14}/> {success}</div>}
          {/* FIX B2.6: rotulo explicita que cadastro e local */}
          <div className="row gap-3" style={{ marginTop: 20, justifyContent: "flex-end" }}><Button variant="ghost" type="button" onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="primary" type="submit" loading={saving}>Cadastrar (local)</Button></div>
        </form>
      </div>
    </div>
  );
}

const USER_COLS = [
  { key: "nome", label: "Usuário", always: true },
  { key: "email", label: "Email" },
  { key: "role", label: "Cargo" },
  // REQ 1.4: coluna grupo de acesso na lista
  { key: "grupo", label: "Grupo" },
  { key: "status", label: "Status" },
  { key: "carga", label: "Carga (PIs)" },
  { key: "sla", label: "SLA médio" },
  { key: "lastSeen", label: "Último acesso" },
];

function ColumnsMenu({ cols, visible, onToggle }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button variant="ghost" icon="columns" iconRight="chevron_down" onClick={() => setOpen(o => !o)}>Colunas</Button>
      {open && (
        <div className="dropdown" style={{ top: 42, right: 0, minWidth: 200 }}>
          <div style={{ padding: "6px 12px 5px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-4)", fontWeight: 600 }}>Colunas visíveis</div>
          {cols.map(c => (
            <div key={c.key} className="dropdown-item" onClick={() => !c.always && onToggle(c.key)} style={{ justifyContent: "space-between", opacity: c.always ? 0.55 : 1, cursor: c.always ? "default" : "pointer" }}>
              <span>{c.label}</span>
              <span className={"checkbox " + (visible.has(c.key) ? "on" : "")} style={{ width: 16, height: 16 }}>{visible.has(c.key) && <Icon name="check" size={10} strokeWidth={2.4}/>}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserDrawer({ user, checkings, onClose, onRole, onStatus, onGrupo }) {
  const H = window.H;
  /* UXP: normalizar name matching */
  const uName = (user.nome || "").trim().toLowerCase();
  const mine = React.useMemo(() => checkings.filter(c => {
    const a = (c.assigned_to || "").trim().toLowerCase();
    const p = (c.approval_user || "").trim().toLowerCase();
    return a === uName || p === uName;
  }), [checkings, uName]);
  const pend = mine.filter(c => H.norm(c.status) === "pending");
  const done = mine.filter(c => c.approvedAt || c.rejectedAt);
  const avgSla = done.length ? done.reduce((s, c) => s + ((c.approvedAt || c.rejectedAt) - c.submittedAt) / 3600000, 0) / done.length : 0;
  const isWorker = user.role === "admin" || user.role === "analyst";
  const grupoLabel = ({ boticario: "Equipe Anne (Boticario)", kauana: "Equipe Kauane (Uninter)", todos: "Todos", nao_definido: "Nao definido" })[user.grupo || "nao_definido"] || user.grupo;

  /* UXP: atividade recente (ultimas 5 decisoes deste usuario) */
  const recentActivity = React.useMemo(() => {
    return checkings
      .filter(c => {
        const p = (c.approval_user || "").trim().toLowerCase();
        return p === uName && (c.approvedAt || c.rejectedAt);
      })
      .sort((a, b) => (b.approvedAt || b.rejectedAt) - (a.approvedAt || a.rejectedAt))
      .slice(0, 5);
  }, [checkings, uName]);

  /* UXP: focus trap + ESC handler */
  const drawerRef = React.useRef(null);
  const closeRef = React.useRef(null);
  React.useEffect(() => {
    /* UXP: foco inicial no botao X */
    if (closeRef.current) closeRef.current.focus();
    /* UXP: ESC fecha o drawer */
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* UXP: focus trap simples (TAB cicla dentro do drawer) */
  const onTrapFocus = React.useCallback((e) => {
    const el = drawerRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, []);
  React.useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    const handler = (e) => { if (e.key === "Tab") onTrapFocus(e); };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [onTrapFocus]);

  return (<>
    {/* UXP: scrim proprio z190 (acima topbar z20) */}
    <div className="user-drawer-scrim" onClick={onClose}/>
    {/* UXP: drawer z200, height 100vh, slide-in translateX */}
    <div className="user-drawer" ref={drawerRef} role="dialog" aria-label={"Perfil de " + user.nome}>
      {/* UXP: header fixo */}
      <div className="user-drawer-head">
        <div className="eyebrow">Perfil do usuario</div>
        <button className="icon-btn" onClick={onClose} ref={closeRef} aria-label="Fechar perfil"><Icon name="x" size={15}/></button>
      </div>
      {/* UXP: body scrollable */}
      <div className="user-drawer-body">
        {/* UXP: identidade (avatar 56, nome 18/600, pill cargo, email mono, meta flex-wrap) */}
        <div className="row gap-3" style={{ alignItems: "center" }}>
          <Avatar user={user} size={56}/>
          <div className="col" style={{ gap: 3, minWidth: 0, flex: 1 }}>
            <div className="row gap-2" style={{ alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{user.nome}</span>
              {user.role === "admin" && <Pill status="admin">Admin</Pill>}
              {user.role === "analyst" && <span className="pill pill-neutral">Analyst</span>}
              {user.role === "viewer" && <span className="pill pill-viewer">Viewer</span>}
            </div>
            <span style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--ink-3)" }}>{user.email}</span>
            {/* UXP: meta em flex-wrap (status + visto + SSO) */}
            <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 4, fontSize: 12, color: "var(--ink-3)", alignItems: "center" }}>
              <span className="row gap-2" style={{ alignItems: "center" }}><span style={{ width: 6, height: 6, borderRadius: 99, background: user.status === "active" ? "var(--accent)" : "var(--ink-4)", flexShrink: 0 }}/>{user.status === "active" ? "ativo" : "inativo"}</span>
              <span style={{ color: "var(--ink-4)" }}>·</span>
              <span>visto {H.fmtRelTime(user.lastSeen)}</span>
              {user.googlePic && <><span style={{ color: "var(--ink-4)" }}>·</span><span className="row gap-2" style={{ alignItems: "center" }}>SSO <Icon name="google" size={11} strokeWidth={1}/></span></>}
            </div>
          </div>
        </div>

        {/* UXP: card Permissao e acesso (campos EMPILHADOS com labels) */}
        <div className="card card-pad">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Permissao e acesso</div>
          <div className="col" style={{ gap: 12 }}>
            {/* UXP: campo Cargo */}
            <div className="ud-field">
              <label className="ud-field-label" htmlFor={"ud-role-" + user.id}>Cargo</label>
              <select className="input" id={"ud-role-" + user.id} value={user.role} onChange={(e) => onRole(user.id, e.target.value)}>
                <option value="viewer">Viewer · so consulta</option>
                <option value="analyst">Analyst · aprova e reprova</option>
                <option value="admin">Admin · acesso total</option>
              </select>
            </div>
            {/* UXP: campo Grupo de acesso */}
            <div className="ud-field">
              <label className="ud-field-label" htmlFor={"ud-grupo-" + user.id}>Grupo de acesso</label>
              <select className="input" id={"ud-grupo-" + user.id} value={user.grupo || "nao_definido"} onChange={(e) => onGrupo && onGrupo(user.id, e.target.value)}>
                <option value="boticario">Equipe Anne (Boticario)</option>
                <option value="kauana">Equipe Kauane (Uninter)</option>
                <option value="todos">Todos (admin)</option>
                {(user.grupo === "nao_definido" || !user.grupo) && <option value="nao_definido" disabled>Nao definido</option>}
              </select>
            </div>
            {/* UXP: botao Ativar/Desativar separado, alinhado a direita */}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
              <Button variant="ghost" size="sm" onClick={() => onStatus(user.id)} style={{ color: user.status === "active" ? "var(--alert)" : "var(--accent)" }}>{user.status === "active" ? "Desativar usuario" : "Ativar usuario"}</Button>
            </div>
          </div>
        </div>

        {/* UXP: secao adaptativa por cargo */}
        {isWorker ? (<>
          {/* UXP: KPIs so para admin/analyst */}
          <div className="grid-cols-3">
            <div className="kpi" style={{ padding: "14px 16px" }}><div className="kpi-label">Em carga</div><div className="kpi-value" style={{ fontSize: 24 }}>{pend.length}</div></div>
            <div className="kpi" style={{ padding: "14px 16px" }}><div className="kpi-label">Concluidos</div><div className="kpi-value" style={{ fontSize: 24, color: "var(--accent)" }}>{done.length}</div></div>
            <div className="kpi" style={{ padding: "14px 16px" }}><div className="kpi-label">SLA medio</div><div className="kpi-value" style={{ fontSize: 24 }}>{avgSla ? avgSla.toFixed(1) + "h" : "·"}</div></div>
          </div>

          {/* UXP: checkings atribuidos ou empty centralizado */}
          <div className="eyebrow">Checkings atribuidos · {mine.length}</div>
          {mine.length === 0 ? (
            <div className="ud-empty-center">
              <Empty title="Nenhum checking atribuido" hint="Atribua demandas na Divisao por conta" icon="users"/>
            </div>
          ) : (
            <div className="col" style={{ gap: 0 }}>
              {mine.slice(0, 10).map((c, i) => (
                <div key={c.submission_id} className="row gap-2" style={{ padding: "9px 0", borderTop: i ? "1px solid var(--rule)" : "none", alignItems: "center" }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: H.norm(c.status) === "pending" ? "var(--warn)" : H.norm(c.status) === "approved" ? "var(--accent)" : "var(--alert)", flexShrink: 0 }}/>
                  <span className="cell-pi" style={{ fontSize: 12 }}>{c.n_pi}</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.cliente}</span>
                  <span className="spacer"/><span className="cell-time">{H.fmtRelTime(c.submittedAt)}</span>
                </div>
              ))}
              {mine.length > 10 && <div className="body-xs muted" style={{ paddingTop: 8 }}>+{mine.length - 10} outros</div>}
            </div>
          )}

          {/* UXP: atividade recente (ultimas 5 decisoes) */}
          {recentActivity.length > 0 && (<>
            <div className="eyebrow">Atividade recente</div>
            <div className="col" style={{ gap: 0 }}>
              {recentActivity.map((c, i) => {
                const wasApproved = !!c.approvedAt;
                const when = c.approvedAt || c.rejectedAt;
                return (
                  <div key={c.submission_id + "-act"} className="ud-activity-row">
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: wasApproved ? "var(--accent)" : "var(--alert)", flexShrink: 0 }}/>
                    <span style={{ fontWeight: 500, color: wasApproved ? "var(--accent)" : "var(--alert)", fontSize: 12 }}>{wasApproved ? "Aprovou" : "Reprovou"}</span>
                    <span className="cell-pi" style={{ fontSize: 11.5 }}>{c.n_pi}</span>
                    <span style={{ color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{c.cliente}</span>
                    <span className="spacer"/>
                    <span className="cell-time">{H.fmtRelTime(when)}</span>
                  </div>
                );
              })}
            </div>
          </>)}
        </>) : (
          /* UXP: viewer nao ve KPIs; ve bloco informativo */
          <div className="ud-viewer-info">
            <div className="ud-vi-icon"><Icon name="eye" size={20}/></div>
            <div className="ud-vi-title">Perfil de consulta</div>
            <div className="ud-vi-text">Este usuario visualiza o painel do grupo {grupoLabel} sem poder aprovar ou reprovar.</div>
            <div style={{ fontSize: 12, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>Ultimo acesso: {H.fmtRelTime(user.lastSeen)}</div>
          </div>
        )}
      </div>
    </div>
  </>);
}

function ScreenUsers({ onToast, viewMode, checkings = [] }) {
  const H = window.H;
  const view = viewMode || "cards";
  const colors = ['#C2410C','#1D4ED8','#7E22CE','#15803D','#B45309','#0E7490','#9F1239','#365314','#7C2D12','#6D28D9','#0F766E','#A21CAF'];
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [users, setUsers] = React.useState(() => window.MOCK.users.map((u, i) => ({ ...u, nome: u.name, lastSeen: u.last_seen })));
  const [showInvite, setShowInvite] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [visCols, setVisCols] = React.useState(() => new Set(["nome", "email", "role", "grupo", "status", "carga", "lastSeen"]));
  const toggleCol = (k) => setVisCols(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const carga = React.useMemo(() => { const m = {}; checkings.forEach(c => { const who = c.assigned_to || c.approval_user; if (who) m[who] = (m[who] || 0) + 1; }); return m; }, [checkings]);
  const slaBy = React.useMemo(() => { const acc = {}; checkings.forEach(c => { const end = c.approvedAt || c.rejectedAt; if (end && c.approval_user) { (acc[c.approval_user] = acc[c.approval_user] || []).push((end - c.submittedAt) / 3600000); } }); const out = {}; Object.entries(acc).forEach(([k, v]) => out[k] = v.reduce((a, b) => a + b, 0) / v.length); return out; }, [checkings]);

  const filtered = users.filter(u => (filter === "all" || u.role === filter) && (!search || (u.nome || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase())));
  const counts = { admin: users.filter(u => u.role === "admin").length, analyst: users.filter(u => u.role === "analyst").length, viewer: users.filter(u => u.role === "viewer").length };

  const setRole = async (id, role) => { const prev = users.find(u => u.id === id)?.role; setUsers(users.map(u => u.id === id ? { ...u, role } : u)); setDetail(d => d && d.id === id ? { ...d, role } : d); try { await window.PainelAPI.updateUserRole(id, role); onToast?.({ type: "success", message: "Cargo atualizado." }); } catch (e) { setUsers(users.map(u => u.id === id ? { ...u, role: prev } : u)); setDetail(d => d && d.id === id ? { ...d, role: prev } : d); onToast?.({ type: "error", message: "Falha ao atualizar cargo: " + e.message }); } };
  const toggleStatus = (id) => { setUsers(users.map(u => u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u)); setDetail(d => d && d.id === id ? { ...d, status: d.status === "active" ? "inactive" : "active" } : d); };
  const addUser = (nu) => { setUsers([...users, { id: "u_" + Date.now(), name: nu.name, nome: nu.name, email: nu.email, role: nu.role, grupo: nu.grupo || "boticario", status: "active", color: colors[users.length % colors.length], avatar: nu.name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase(), googlePic: false, lastSeen: Date.now() }]); onToast?.({ type: "success", message: `${nu.name} adicionado.` }); };
  // REQ 1.4: atualizar grupo do usuario existente + persistir no BigQuery
  const setGrupo = (id, grupo) => {
    const usr = users.find(u => u.id === id);
    const email = usr?.email || id; // USAR EMAIL, nao hash ID
    setUsers(users.map(u => u.id === id ? { ...u, grupo } : u));
    setDetail(d => d && d.id === id ? { ...d, grupo } : d);
    // Sincronizar com window.MOCK.users pra producao/divisao refletir imediatamente
    if (window.MOCK?.users) {
      const mu = window.MOCK.users.find(u => u.id === id || u.email === email);
      if (mu) mu.grupo = grupo;
    }
    // FIX (02/jul): enviar EMAIL pro n8n (hash ID nao existe no BigQuery)
    window.MOCK?.saveGrupo?.(email, grupo)?.then?.(() => {
      onToast?.({ type: "success", message: "Grupo de " + (usr?.nome || email).split(" ")[0] + " salvo no servidor." });
    })?.catch?.((e) => {
      onToast?.({ type: "error", message: "Falha ao salvar grupo: " + (e?.message || "erro desconhecido") });
      // Reverter
      setUsers(users.map(u => u.id === id ? { ...u, grupo: usr?.grupo } : u));
      setDetail(d => d && d.id === id ? { ...d, grupo: usr?.grupo } : d);
    });
  };
  // BUG 2.4: escape de aspas duplicadas + BOM UTF-8 para Excel
  const exportCsv = () => {
    const esc = (v) => '"' + String(v || "").replace(/"/g, '""') + '"';
    const header = "Nome,Email,Role,Grupo,Status,Último Acesso\n";
    const r = users.map(u => [esc(u.nome), esc(u.email), esc(u.role), esc(u.grupo || "boticario"), esc(u.status), esc(new Date(u.lastSeen).toLocaleString("pt-BR"))].join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + r], { type: "text/csv;charset=utf-8;" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "usuarios_painel.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page fade-in">
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={addUser}/>}
      <div className="page-head">
        <div className="col" style={{ gap: 6 }}><div className="eyebrow">Gestão · admin only</div><h1 className="display-1">Usuários</h1></div>
        <div className="row gap-3"><Button variant="ghost" icon="download" onClick={exportCsv}>Exportar lista</Button><Button variant="primary" icon="plus" onClick={() => setShowInvite(true)}>Convidar usuário</Button></div>
      </div>
      <div className="grid-cols-4 stagger" style={{ marginBottom: 22 }}>
        <div className="kpi"><div className="kpi-label">Total</div><div className="kpi-value"><CountUp value={users.length}/></div><div className="kpi-meta">SSO ativo em <strong>{users.filter(u => u.googlePic).length}</strong></div></div>
        <div className="kpi"><div className="kpi-label">Admins</div><div className="kpi-value"><CountUp value={counts.admin}/></div><div className="kpi-meta">acesso total</div></div>
        <div className="kpi"><div className="kpi-label">Analysts</div><div className="kpi-value"><CountUp value={counts.analyst}/></div><div className="kpi-meta">aprovam e reprovam</div></div>
        <div className="kpi"><div className="kpi-label">Viewers</div><div className="kpi-value"><CountUp value={counts.viewer}/></div><div className="kpi-meta">só consulta</div></div>
      </div>
      <div className="row gap-3" style={{ marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Nome ou email…" style={{ flex: "1 1 320px", maxWidth: 480 }}/>
        <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "Todos" }, { value: "admin", label: "Admin" }, { value: "analyst", label: "Analyst" }, { value: "viewer", label: "Viewer" }]}/>
        {view === "lista" && <ColumnsMenu cols={USER_COLS} visible={visCols} onToggle={toggleCol}/>}
        <div className="spacer"/><span className="muted-2" style={{ fontSize: 12.5, fontFamily: "var(--font-mono)" }}>{filtered.length} usuários</span>
      </div>
      {filtered.length === 0 && <Empty title="Nenhum usuário" hint="Convide membros" icon="users"/>}
      {filtered.length > 0 && view === "lista" && (
        <div className="card">
          <table className="tbl"><thead><tr>
            {USER_COLS.filter(c => visCols.has(c.key)).map(c => <th key={c.key}>{c.label}</th>)}
            <th style={{ width: 40 }}/>
          </tr></thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={user.id} className="row-action row-anim" style={{ animationDelay: (i * 22) + "ms" }} onClick={() => setDetail(user)}>
                  {visCols.has("nome") && <td><div className="row gap-2"><Avatar user={user} size={26} online={user.status === "active" && i < 5}/><span style={{ fontWeight: 500 }}>{user.nome}</span></div></td>}
                  {visCols.has("email") && <td className="cell-mono cell-secondary" style={{ fontSize: 12 }}>{user.email}</td>}
                  {visCols.has("role") && <td>{user.role === "admin" ? <Pill status="admin">Admin</Pill> : user.role === "viewer" ? <span className="pill pill-viewer">Viewer</span> : <span className="pill pill-neutral">Analyst</span>}</td>}
                  {/* REQ 1.4: coluna grupo */}
                  {visCols.has("grupo") && <td><span className={"pill " + (user.grupo === "nao_definido" ? "pill-warn" : "pill-neutral")} style={{ fontSize: 10.5 }}>{({ boticario: "Anne (Boticario)", kauana: "Kauane (Uninter)", todos: "Todos", nao_definido: "Nao definido" })[user.grupo || "nao_definido"] || user.grupo}</span></td>}
                  {visCols.has("status") && <td><span className="row gap-2" style={{ fontSize: 12.5 }}><span style={{ width: 6, height: 6, borderRadius: 99, background: user.status === "active" ? "var(--accent)" : "var(--ink-4)" }}/>{user.status === "active" ? "ativo" : "inativo"}</span></td>}
                  {visCols.has("carga") && <td className="cell-mono">{carga[user.nome] || 0}</td>}
                  {visCols.has("sla") && <td className="cell-mono">{slaBy[user.nome] ? slaBy[user.nome].toFixed(1) + "h" : "·"}</td>}
                  {visCols.has("lastSeen") && <td className="cell-time">{H.fmtRelTime(user.lastSeen)}</td>}
                  <td><span className="row-arrow"><Icon name="arrow_right"/></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > 0 && view === "cards" && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {filtered.map((user, i) => (
          <div key={user.id} className="card card-hover" style={{ animation: "rowIn 400ms var(--ease-out) both", animationDelay: (i * 30) + "ms", cursor: "pointer" }} onClick={() => setDetail(user)}>
            <div style={{ padding: "18px 20px 14px" }}>
              <div className="row gap-3" style={{ alignItems: "flex-start" }}>
                <Avatar user={user} size={42} online={user.status === "active" && i < 5}/>
                <div className="col" style={{ flex: 1, minWidth: 0 }}>
                  <div className="row gap-2" style={{ alignItems: "center" }}><span style={{ fontSize: 14, fontWeight: 500 }}>{user.nome}</span>{user.role === "admin" && <Pill status="admin">Admin</Pill>}{user.role === "viewer" && <span className="pill pill-viewer">Viewer</span>}</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                </div>
                <span className="row-arrow" style={{ opacity: 0.4 }}><Icon name="arrow_right"/></span>
              </div>
              <div className="row gap-3" style={{ marginTop: 12, fontSize: 12, color: "var(--ink-3)" }}>
                <div className="row gap-2"><span style={{ width: 6, height: 6, borderRadius: 99, background: user.status === "active" ? "var(--accent)" : "var(--ink-4)" }}/>{user.status === "active" ? "ativo" : "inativo"}</div>
                <span>·</span><span><b style={{ color: "var(--ink-2)" }}>{carga[user.nome] || 0}</b> em carga</span>
                <span>·</span><span>{H.fmtRelTime(user.lastSeen)}</span>
              </div>
            </div>
            <div className="row gap-2" style={{ padding: "10px 14px", borderTop: "1px solid var(--rule)", background: "var(--bg)" }} onClick={(e) => e.stopPropagation()}>
              <select className="input" value={user.role} onChange={(e) => setRole(user.id, e.target.value)} style={{ flex: 1, height: 30, fontSize: 12, padding: "0 8px" }}><option value="viewer">Viewer</option><option value="analyst">Analyst</option><option value="admin">Admin</option></select>
              <Button variant="ghost" size="sm" onClick={() => toggleStatus(user.id)}>{user.status === "active" ? "Desativar" : "Ativar"}</Button>
            </div>
          </div>
        ))}
      </div>
      )}
      {detail && <UserDrawer user={detail} checkings={checkings} onClose={() => setDetail(null)} onRole={setRole} onStatus={toggleStatus} onGrupo={setGrupo}/>}

      {/* REQ 1.4c: secao Equipes derivada */}
      <div style={{ marginTop: 32 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Equipes de checking</div>
        <div className="grid-cols-2" style={{ gap: 16 }}>
          {["boticario", "kauana"].map(g => {
            const membros = window.MOCK?.teamMembers?.(g) || [];
            const gestoras = window.MOCK?.teamManagers?.(g) || [];
            const label = g === "boticario" ? "Checking Boticario" : "Checking Uninter";
            return (
              <div key={g} className="card card-pad">
                <div className="row gap-2" style={{ alignItems: "center", marginBottom: 12 }}>
                  <Icon name="users" size={15} style={{ color: "var(--accent)" }}/>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
                  <span className="spacer"/>
                  <span className="pill pill-neutral" style={{ fontSize: 10 }}>{membros.length} membro{membros.length !== 1 ? "s" : ""}</span>
                </div>
                {/* Gestoras omitidas: admin com grupo "todos" aparecia em ambos os cards */}
                {membros.length > 0 ? (
                  <div className="col" style={{ gap: 0 }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>Membros (analistas)</div>
                    {membros.map((u, i) => (
                      <div key={u.id || u.email} className="row gap-2" style={{ padding: "6px 0", borderTop: i ? "1px solid var(--rule)" : "none", alignItems: "center", fontSize: 13 }}>
                        <Avatar user={u} size={22}/>
                        <span style={{ fontWeight: 500 }}>{u.nome || u.name}</span>
                        <span className="spacer"/>
                        <span className="cell-mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{u.email}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="body-xs muted">Nenhum analista com grupo "{g}" cadastrado.</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
window.ScreenUsers = ScreenUsers;
