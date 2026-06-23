// screen-comprovante.jsx — Layout do Comprovante de veiculações (PDF) -> window.Comprovante
function Comprovante({ checking, onClose }) {
  const H = window.H;
  // Gera dias e horários programado/veiculado determinísticos a partir do checking
  const data = React.useMemo(() => {
    let seed = 0; for (const ch of checking.submission_id) seed = (seed * 31 + ch.charCodeAt(0)) % 1e9;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const base = new Date(checking.submittedAt);
    const slots = ["06:30", "08:30", "11:00", "12:00", "13:00", "14:00", "14:45", "15:30", "17:00"];
    const nDays = 12 + Math.floor(rnd() * 6);
    const rows = [];
    let totalProg = 0, totalVeic = 0;
    for (let d = 0; d < nDays; d++) {
      const dt = new Date(base.getTime() - (nDays - d) * 86400000);
      const nSlots = 6 + Math.floor(rnd() * 3);
      const prog = slots.slice(0, nSlots);
      const veic = prog.map(s => { const [h, m] = s.split(":").map(Number); const off = Math.floor(rnd() * 22) - 9; let mm = h * 60 + m + off; const hh = Math.floor(mm / 60); const mi = ((mm % 60) + 60) % 60; return `${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}`; });
      totalProg += prog.length; totalVeic += veic.length;
      rows.push({ date: dt, prog, veic });
    }
    return { rows, totalProg, totalVeic };
  }, [checking.submission_id]);

  const fmtD = (dt) => `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  const doPrint = () => window.print();

  return (<>
    <div className="scrim" onClick={onClose} style={{ zIndex: 1200 }}/>
    <div className="comprovante-shell">
      <div className="comprovante-bar">
        <span className="row gap-2"><Icon name="pdf" size={15}/><b>Comprovante de veiculações</b><span className="cell-mono muted">{checking.n_pi}</span></span>
        <div className="row gap-2">
          <Button variant="ghost" size="sm" icon="download" onClick={doPrint}>Imprimir / PDF</Button>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={15}/></button>
        </div>
      </div>
      <div className="comprovante-scroll">
        <div className="comprovante-page" id="comprovante-print">
          <div className="cp-head">
            <div className="cp-emissora">
              <div className="cp-logo">{(checking.veiculo || "").split(" ").map(s => s[0]).slice(0, 2).join("")}</div>
              <div className="cp-emissora-info">
                <div><b>Emissora: {checking.veiculo} Ltda</b></div>
                <div>CNPJ: 83.747.949/0001-87</div>
                <div>Endereço: Rua Coronel Aristiliano Ramos, 485 1a andar</div>
                <div>Cidade-UF: {checking.praca}</div>
                <div>E-mail: financeiro@{(checking.veiculo || "").toLowerCase().replace(/[^a-z]/g, "")}.com.br</div>
              </div>
            </div>
            <div className="cp-emissora-right">
              <div>Insc. Estadual: 25.685.038-0</div>
              <div>Fone: 4733320783</div>
              <div>Data: {fmtD(new Date())} {H.fmtTime(Date.now())}</div>
            </div>
          </div>
          <div className="cp-title">Comprovante de veiculações</div>
          <div className="cp-block">
            <div className="cp-grid">
              <div><span>Cliente:</span> <b>{checking.cliente}</b></div>
              <div><span>Nº da PI:</span> <b className="mono">{checking.n_pi}</b></div>
              <div><span>Contrato:</span> <b className="mono">0{Math.abs(checking.submission_id.length * 731 % 90000) + 3000}</b></div>
              <div><span>Produto:</span> <b>{checking.submarca} {checking.meio}</b></div>
              <div><span>Campanha:</span> <b>MAES</b></div>
              <div><span>Agência:</span> <b>OPUSMULTIPLA</b></div>
              <div><span>Praça:</span> <b>{checking.praca}</b></div>
              <div><span>Período:</span> <b>{fmtD(data.rows[0].date)} a {fmtD(data.rows[data.rows.length - 1].date)}</b></div>
            </div>
          </div>
          <div className="cp-material">Material: {checking.n_pi} · {checking.cliente} {checking.submarca} 30s &nbsp;&nbsp; Duração: 00:30,0 &nbsp;&nbsp; Tempo de serviço: 30 segundos</div>
          <div className="cp-rows">
            {data.rows.map((r, i) => (
              <div key={i} className="cp-day">
                <div className="cp-date">{fmtD(r.date)}</div>
                <div className="cp-line"><span className="cp-lbl">Programado:</span> {r.prog.join(" - ")}</div>
                <div className="cp-line cp-veic"><span className="cp-lbl">Veiculado:</span> {r.veic.join(" - ")}</div>
              </div>
            ))}
          </div>
          <div className="cp-foot">
            <div className="cp-sign">
              <div style={{ fontWeight: 700, color: "#1a5", fontSize: 11 }}>{(checking.veiculo || "").toUpperCase()} LTDA</div>
              <div style={{ fontSize: 9, color: "#666" }}>Assinado de forma digital · {fmtD(new Date())}</div>
            </div>
            <div className="cp-totais">
              <div>Total programado: <b>{data.totalProg}</b></div>
              <div>Total bonificado: <b>0</b></div>
              <div>Total veiculado: <b>{data.totalVeic}</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>);
}
window.Comprovante = Comprovante;
