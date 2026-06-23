// screen-users.jsx -> window.ScreenUsers
function InviteModal({ onClose, onSuccess }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("viewer");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const submit = (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!name.trim() || !email.trim() || !password.trim()) { setError("Preencha todos os campos obrigatórios."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email inválido."); return; }
    if (password.length < 6) { setError("Senha deve ter pelo menos 6 caracteres."); return; }
    setSaving(true);
    setTimeout(() => { setSaving(false); setSuccess(`Usuário ${name.trim()} cadastrado com sucesso!`); setTimeout(() => { onSuccess({ name: name.trim(), email: email.trim().toLowerCase(), role }); onClose(); }, 1000); }, 800);
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
              <select className="input" value={role} onChange={e => setRole(e.target.value)}><option value="viewer">Viewer · só consulta</option><option value="analyst">Analyst · aprova e reprova</option><option value="admin">Admin · acesso total</option></select>
            </div>
          </div>
          {error && <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--alert-soft)", color: "var(--alert)", borderRadius: 10, fontSize: 13, display: "flex", gap: 8, alignItems: "center", border: "1px solid color-mix(in srgb, var(--alert) 25%, transparent)" }}><Icon name="warn" size={14}/> {error}</div>}
          {success && <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 10, fontSize: 13, display: "flex", gap: 8, alignItems: "center", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}><Icon name="check" size={14}/> {success}</div>}
          <div className="row gap-3" style={{ marginTop: 20, justifyContent: "flex-end" }}><Button variant="ghost" type="button" onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="primary" type="submit" loading={saving}>Cadastrar usuário</Button></div>
        </form>
      </div>
    </div>
  );
}

const USER_COLS = [
  { key: "nome", label: "Usuário", always: true },
  { key: "email", label: "Email" },
  { key: "role", label: "Cargo" },
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

function UserDrawer({ user, checkings, onClose, onRole, onStatus }) {
  const H = window.H;
  const mine = React.useMemo(() => checkings.filter(c => c.assigned_to === user.nome || c.approval_user === user.nome), [checkings, user]);
  const pend = mine.filter(c => H.norm(c.status) === "pending");
  const done = mine.filter(c => c.approvedAt || c.rejectedAt);
  const avgSla = done.length ? done.reduce((s, c) => s + ((c.approvedAt || c.rejectedAt) - c.submittedAt) / 3600000, 0) / done.length : 0;
  const roleLabel = { admin: "Admin", analyst: "Analyst", viewer: "Viewer de mídia" }[user.role];
  return (<>
    <div className="scrim" onClick={onClose} style={{ zIndex: 130 }}/>
    <div className="user-drawer content">
      <div className="row" style={{ justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--rule)" }}>
        <div className="eyebrow">Perfil do usuário</div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={15}/></button>
      </div>
      <div style={{ padding: "22px", overflowY: "auto" }}>
        <div className="row gap-3" style={{ alignItems: "center", marginBottom: 18 }}>
          <Avatar user={user} size={52}/>
          <div className="col" style={{ gap: 3, minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: "center" }}><span style={{ fontSize: 18, fontWeight: 600 }}>{user.nome}</span>{user.role === "admin" && <Pill status="admin">Admin</Pill>}</div>
            <span style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--ink-3)" }}>{user.email}</span>
          </div>
        </div>
        <div className="grid-cols-3" style={{ marginBottom: 18 }}>
          <div className="kpi" style={{ padding: "14px 16px" }}><div className="kpi-label">Em carga</div><div className="kpi-value" style={{ fontSize: 24 }}>{pend.length}</div></div>
          <div className="kpi" style={{ padding: "14px 16px" }}><div className="kpi-label">Concluídos</div><div className="kpi-value" style={{ fontSize: 24, color: "var(--accent)" }}>{done.length}</div></div>
          <div className="kpi" style={{ padding: "14px 16px" }}><div className="kpi-label">SLA médio</div><div className="kpi-value" style={{ fontSize: 24 }}>{avgSla ? avgSla.toFixed(1) + "h" : "·"}</div></div>
        </div>
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Permissão e acesso</div>
          <div className="row gap-2" style={{ alignItems: "center" }}>
            <select className="input" value={user.role} onChange={(e) => onRole(user.id, e.target.value)} style={{ flex: 1, height: 34 }}><option value="viewer">Viewer · só consulta</option><option value="analyst">Analyst · aprova e reprova</option><option value="admin">Admin · acesso total</option></select>
            <Button variant="ghost" size="sm" onClick={() => onStatus(user.id)}>{user.status === "active" ? "Desativar" : "Ativar"}</Button>
          </div>
          <div className="row gap-3" style={{ marginTop: 10, fontSize: 12, color: "var(--ink-3)" }}>
            <span className="row gap-2"><span style={{ width: 6, height: 6, borderRadius: 99, background: user.status === "active" ? "var(--accent)" : "var(--ink-4)" }}/>{user.status === "active" ? "ativo" : "inativo"}</span>
            <span>·</span><span>visto {H.fmtRelTime(user.lastSeen)}</span>
            {user.googlePic && <><span>·</span><span className="row gap-2">SSO <Icon name="google" size={11} strokeWidth={1}/></span></>}
          </div>
        </div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Checkings atribuídos · {mine.length}</div>
        {mine.length === 0 ? <div className="body-xs muted">Nenhum checking atribuído a este usuário.</div> : (
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
  const [visCols, setVisCols] = React.useState(() => new Set(["nome", "email", "role", "status", "carga", "lastSeen"]));
  const toggleCol = (k) => setVisCols(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const carga = React.useMemo(() => { const m = {}; checkings.forEach(c => { const who = c.assigned_to || c.approval_user; if (who) m[who] = (m[who] || 0) + 1; }); return m; }, [checkings]);
  const slaBy = React.useMemo(() => { const acc = {}; checkings.forEach(c => { const end = c.approvedAt || c.rejectedAt; if (end && c.approval_user) { (acc[c.approval_user] = acc[c.approval_user] || []).push((end - c.submittedAt) / 3600000); } }); const out = {}; Object.entries(acc).forEach(([k, v]) => out[k] = v.reduce((a, b) => a + b, 0) / v.length); return out; }, [checkings]);

  const filtered = users.filter(u => (filter === "all" || u.role === filter) && (!search || (u.nome || "").toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())));
  const counts = { admin: users.filter(u => u.role === "admin").length, analyst: users.filter(u => u.role === "analyst").length, viewer: users.filter(u => u.role === "viewer").length };

  const setRole = (id, role) => { setUsers(users.map(u => u.id === id ? { ...u, role } : u)); setDetail(d => d && d.id === id ? { ...d, role } : d); onToast?.({ type: "success", message: "Cargo atualizado." }); };
  const toggleStatus = (id) => { setUsers(users.map(u => u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u)); setDetail(d => d && d.id === id ? { ...d, status: d.status === "active" ? "inactive" : "active" } : d); };
  const addUser = (nu) => { setUsers([...users, { id: "u_" + Date.now(), name: nu.name, nome: nu.name, email: nu.email, role: nu.role, status: "active", color: colors[users.length % colors.length], avatar: nu.name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase(), googlePic: false, lastSeen: Date.now() }]); onToast?.({ type: "success", message: `${nu.name} adicionado.` }); };
  const exportCsv = () => {
    const header = "Nome,Email,Role,Status,Último Acesso\n";
    const r = users.map(u => `"${u.nome}","${u.email}","${u.role}","${u.status}","${new Date(u.lastSeen).toLocaleString("pt-BR")}"`).join("\n");
    const blob = new Blob([header + r], { type: "text/csv;charset=utf-8;" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "usuarios_painel.csv"; a.click(); URL.revokeObjectURL(a.href);
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
        <SearchInput value={search} onChange={setSearch} placeholder="Nome ou email…" style={{ flex: "1 1 280px", maxWidth: 360 }}/>
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
      {detail && <UserDrawer user={detail} checkings={checkings} onClose={() => setDetail(null)} onRole={setRole} onStatus={toggleStatus}/>}
    </div>
  );
}
window.ScreenUsers = ScreenUsers;
