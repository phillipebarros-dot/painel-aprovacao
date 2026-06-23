// screen-automacoes.jsx -> window.ScreenAutomacoes
// Regras de automação (Ticket automation rules da Atera + workflows do TicketZero).
const AUTO_DEFAULTS = [
  { id: "dist_cliente", group: "Distribuição", icon: "layers", title: "Distribuir por cliente", desc: "Todo PI novo de um cliente vai para a pessoa responsável.", on: true, cond: "Boticário SP", act: "Marlene Guimarães" },
  { id: "dist_mensal", group: "Distribuição", icon: "calendar", title: "Lembrete de divisão mensal", desc: "No primeiro dia útil do mês, avisar o admin para separar a demanda do mês.", on: true, cond: "1º dia útil", act: "Notificar admin" },
  { id: "dist_balance", group: "Distribuição", icon: "users", title: "Equilibrar carga", desc: "Quando alguém passar de 80 PIs em fila, sugerir redistribuir o excedente.", on: false, cond: "> 80 PIs", act: "Sugerir redistribuição" },
  { id: "notif_reprovado", group: "Notificações", icon: "x", title: "Notificar reprovação com motivo", desc: "Ao reprovar, enviar e-mail ao veículo com o motivo registrado.", on: true, cond: "Ao reprovar", act: "E-mail ao fornecedor" },
  { id: "notif_emdia", group: "Notificações", icon: "check", title: "Confirmar checking em dia", desc: "Ao aprovar, avisar o fornecedor de que o checking está OK.", on: true, cond: "Ao aprovar", act: "E-mail ao fornecedor" },
  { id: "sla_risco", group: "SLA e escalonamento", icon: "clock", title: "Alertar SLA em risco", desc: "Marcar como risco quando o checking passar do limite de horas em fila.", on: true, cond: "> 4 h em fila", act: "Marcar em risco" },
  { id: "sla_parado", group: "SLA e escalonamento", icon: "warn", title: "Escalar PI parado", desc: "PI parado há mais de 30 dias é escalado para o admin responsável.", on: true, cond: "> 30 dias", act: "Escalar ao admin" },
  { id: "ai_triagem", group: "SLA e escalonamento", icon: "bolt", title: "Pré-triagem por IA", desc: "A IA classifica a fila por confiança e separa o que é seguro revisar primeiro.", on: true, cond: "Confiança ≥ 80%", act: "Ordenar fila" },
];

function RuleBuilder({ onClose, onCreate }) {
  const [title, setTitle] = React.useState("");
  const [cond, setCond] = React.useState("");
  const [act, setAct] = React.useState("");
  const [group, setGroup] = React.useState("Distribuição");
  return (<>
    <div className="scrim" onClick={onClose} style={{ zIndex: 130 }}/>
    <div className="modal content" style={{ width: "min(520px, 92vw)", zIndex: 131 }}><div className="card-pad">
      <div className="eyebrow" style={{ marginBottom: 8 }}>Nova regra</div>
      <h2 className="display-3" style={{ marginBottom: 16 }}>Quando isto acontecer, faça aquilo</h2>
      <div className="col gap-3">
        <div className="col" style={{ gap: 5 }}><label className="eyebrow" style={{ fontSize: 10 }}>Nome da regra</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Priorizar mídia exterior"/></div>
        <div className="row gap-3">
          <div className="col" style={{ gap: 5, flex: 1 }}><label className="eyebrow" style={{ fontSize: 10 }}>Quando (condição)</label><input className="input" value={cond} onChange={e => setCond(e.target.value)} placeholder="Ex: meio = Mídia Exterior"/></div>
          <div className="col" style={{ gap: 5, flex: 1 }}><label className="eyebrow" style={{ fontSize: 10 }}>Então (ação)</label><input className="input" value={act} onChange={e => setAct(e.target.value)} placeholder="Ex: marcar prioridade alta"/></div>
        </div>
        <div className="col" style={{ gap: 5 }}><label className="eyebrow" style={{ fontSize: 10 }}>Grupo</label>
          <select className="input" value={group} onChange={e => setGroup(e.target.value)}><option>Distribuição</option><option>Notificações</option><option>SLA e escalonamento</option></select>
        </div>
      </div>
      <div className="row gap-3" style={{ justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="accent" icon="check" disabled={!title || !cond || !act} onClick={() => onCreate({ id: "custom_" + Date.now(), group, icon: "bolt", title, desc: `Quando ${cond}, ${act}.`, on: true, cond, act })}>Criar regra</Button>
      </div>
    </div></div>
  </>);
}

function ScreenAutomacoes({ onToast }) {
  const [rules, setRules] = React.useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("painel_auto_rules") || "null"); if (saved && saved.length) return saved; } catch (e) {}
    return AUTO_DEFAULTS;
  });
  const [builder, setBuilder] = React.useState(false);
  const persist = (next) => { setRules(next); localStorage.setItem("painel_auto_rules", JSON.stringify(next)); };
  const toggle = (id) => { const next = rules.map(r => r.id === id ? { ...r, on: !r.on } : r); persist(next); const r = next.find(x => x.id === id); onToast?.({ type: r.on ? "success" : "info", message: `Regra "${r.title}" ${r.on ? "ativada" : "pausada"}.` }); };
  const create = (rule) => { persist([...rules, rule]); setBuilder(false); onToast?.({ type: "success", message: "Regra criada." }); };
  const remove = (id) => { persist(rules.filter(r => r.id !== id)); };

  const groups = ["Distribuição", "Notificações", "SLA e escalonamento"];
  const active = rules.filter(r => r.on).length;
  const runs = React.useMemo(() => 120 + Math.round(active * 37.5), [active]);

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div className="col" style={{ gap: 6, flex: "1 1 340px" }}>
          <div className="eyebrow">Motor de regras · sem código</div>
          <h1 className="display-1">Automações</h1>
        </div>
        <div className="row gap-3"><Button variant="accent" icon="bolt" onClick={() => setBuilder(true)}>Nova regra</Button></div>
      </div>

      <div className="grid-cols-4 stagger" style={{ marginBottom: "var(--gap)" }}>
        <div className="kpi"><div className="kpi-label">Regras ativas</div><div className="kpi-value"><CountUp value={active}/><span className="unit">/{rules.length}</span></div><div className="kpi-meta">rodando no painel</div></div>
        <div className="kpi"><div className="kpi-label">Execuções · 30 dias</div><div className="kpi-value" style={{ color: "var(--accent)" }}><CountUp value={runs}/></div><div className="kpi-meta">ações disparadas automaticamente</div></div>
        <div className="kpi"><div className="kpi-label">Distribuição</div><div className="kpi-value">{rules.filter(r => r.group === "Distribuição" && r.on).length}</div><div className="kpi-meta">regras de atribuição</div></div>
        <div className="kpi"><div className="kpi-label">Notificações</div><div className="kpi-value">{rules.filter(r => r.group === "Notificações" && r.on).length}</div><div className="kpi-meta">avisos ao fornecedor</div></div>
      </div>

      <div className="col" style={{ gap: "var(--gap)" }}>
        {groups.map(g => {
          const list = rules.filter(r => r.group === g);
          if (!list.length) return null;
          return (
            <div key={g} className="card">
              <div className="card-head"><div className="col" style={{ gap: 2 }}><div className="eyebrow">{g}</div><div className="h2">{list.filter(r => r.on).length} de {list.length} ativas</div></div></div>
              <div className="card-pad" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 12 }}>
                {list.map((r, i) => (
                  <div key={r.id} className={"rule-card " + (r.on ? "on" : "")} style={{ animation: "rowIn 380ms var(--ease-out) both", animationDelay: (i * 30) + "ms" }}>
                    <div className="row gap-3" style={{ alignItems: "flex-start" }}>
                      <span className="rule-ic"><Icon name={r.icon} size={15}/></span>
                      <div className="col" style={{ gap: 3, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.title}</span>
                        <span className="body-xs" style={{ color: "var(--ink-3)", lineHeight: 1.5 }}>{r.desc}</span>
                      </div>
                      <button className={"switch " + (r.on ? "on" : "")} onClick={() => toggle(r.id)} title={r.on ? "Pausar" : "Ativar"}><span className="switch-knob"/></button>
                    </div>
                    <div className="rule-flow">
                      <span className="rule-tag">Quando</span><span className="rule-val">{r.cond}</span>
                      <Icon name="arrow_right" size={13} style={{ color: "var(--ink-4)" }}/>
                      <span className="rule-tag act">Então</span><span className="rule-val">{r.act}</span>
                      {r.id.startsWith("custom_") && <button className="note-del" style={{ marginLeft: "auto" }} title="Remover" onClick={() => remove(r.id)}><Icon name="x" size={12}/></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="body-xs muted" style={{ marginTop: 16 }}>As regras são a camada visual do processo. O disparo real de e-mails e a atribuição automática rodam no backend; aqui você liga, desliga e configura o que cada regra faz.</p>

      {builder && <RuleBuilder onClose={() => setBuilder(false)} onCreate={create}/>}
    </div>
  );
}
window.ScreenAutomacoes = ScreenAutomacoes;
