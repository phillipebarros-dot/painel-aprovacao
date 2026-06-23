// screen-login.jsx — Split-screen login: mural de operação ao vivo + form funcional
function ScreenLogin({ onLogin }) {
  const H = window.H;
  const [email, setEmail] = React.useState(() => localStorage.getItem("painel_last_email") || "");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [remember, setRemember] = React.useState(() => localStorage.getItem("painel_remember") !== "off");
  const [capsOn, setCapsOn] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const STATS = { total: window.MOCK.checkings.length, sla: "-", veic: H.extractList(window.MOCK.checkings, "veiculo").length };

  // Google Identity Services (SSO real)
  React.useEffect(() => {
    let done = false;
    const init = () => {
      if (done || !window.google?.accounts?.id || !window.PainelAPI) return;
      done = true;
      window.google.accounts.id.initialize({
        client_id: window.PainelAPI.GOOGLE_CLIENT_ID,
        callback: async (resp) => {
          if (!resp?.credential) return;
          setLoading(true);setError("");
          try {
            const d = await window.PainelAPI.loginWithGoogle(resp.credential);
            if (d?.user) onLogin({ ...d.user, name: d.user.name || d.user.email });else
            setError("Falha no login com Google.");
          } catch (err) {setError(err.message || "Falha no login com Google.");} finally
          {setLoading(false);}
        }
      });
    };
    if (window.google?.accounts?.id && window.PainelAPI) init();else {
      window.addEventListener("load", init);
      window.addEventListener("painel-api-ready", init);
    }
    return () => {window.removeEventListener("load", init);window.removeEventListener("painel-api-ready", init);};
  }, []);

  const persist = (em) => {
    if (remember && em) {localStorage.setItem("painel_last_email", em);localStorage.setItem("painel_remember", "on");} else
    {localStorage.removeItem("painel_last_email");localStorage.setItem("painel_remember", "off");}
  };
  const googleLogin = () => {
    if (!window.google?.accounts?.id) {setError("Google SSO ainda carregando, tente em 1s.");return;}
    setError("");
    window.google.accounts.id.prompt();
  };
  const submit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {setError("Preencha email e senha.");return;}
    if (!window.PainelAPI) {setError("Conectando ao servidor, tente novamente.");return;}
    setLoading(true);setError("");persist(email);
    try {
      const d = await window.PainelAPI.login(email, password);
      if (d?.user) onLogin({ ...d.user, name: d.user.name || d.user.email });else
      setError("Credenciais inválidas.");
    } catch (err) {setError(err.message || "Credenciais inválidas.");} finally
    {setLoading(false);}
  };
  const onPwKey = (e) => {try {setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));} catch {}};

  return (
    <div className="login-split">
      <div className="login-left">
        <div className="login-aurora"><div className="glow" /><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /><div className="ray" /><div className="ray r2" /><div className="ray r3" /><div className="mesh" /></div>
        <ShaderBg />
        <div className="login-shader-scrim" /><div className="login-vignette" />

        <div className="login-left-head">
          <div className="row gap-3">
            <div className="login-brand-mark"><img src="assets/img/logo-grupoom.png" alt="Grupo OM" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <div className="col" style={{ gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>Grupo OM</span>
              <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>painel · checking</span>
            </div>
            <span className="spacer" />
            <img src="assets/img/gptw-badge.gif" alt="Great Place To Work Certificada" className="login-gptw" title="Great Place To Work · Certificada Jun/2025 - Jun/2026" />
          </div>
        </div>

        <div className="login-left-body">
          <div className="eyebrow" style={{ marginBottom: 20 }}>Departamento de Mídia</div>
          <h1 className="login-hero">Aprove o<br /><span className="hero-accent">checking</span> sem<br />perder o ritmo.</h1>
          <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.65, marginTop: 26, maxWidth: 430 }}>
            Fila de aprovação, SLA, comprovação de veiculação e relatórios das campanhas em um só painel. Decida em segundos, com histórico auditável.
          </p>

          <div className="login-deck">
            {[["approvals", "Aprovação", "fila com SLA e decisão rápida"], ["target", "Nero", "assistente de checagem por meio"], ["warn", "Alertas", "monitoramento de prazos em risco"]].map(([ic, t, d], i) =>
            <div key={t} className={"login-deck-card c" + i}>
                <span className="login-cap-ico"><Icon name={ic} size={15} /></span>
                <div className="col" style={{ gap: 2, minWidth: 0 }}><span className="login-cap-t">{t}</span><span className="login-cap-d">{d}</span></div>
              </div>
            )}
          </div>

          {STATS.total > 0 && <div className="login-kpis">
            <div><div className="login-kpi-value"><CountUp value={STATS.total} dur={1400} /></div><div className="login-kpi-label">Checkings auditados</div></div>
            <div><div className="login-kpi-value">{STATS.sla}h</div><div className="login-kpi-label">SLA médio</div></div>
            <div><div className="login-kpi-value"><CountUp value={STATS.veic} dur={1400} /></div><div className="login-kpi-label">Veículos cobertos</div></div>
          </div>}
        </div>

        <div className="login-left-foot">
          <div className="row gap-6" style={{ alignItems: "center" }}>
            {[
            { n: "opus", src: "logo-opus-real" }, { n: "dom", src: "logo-dom-real" }, { n: "senso", src: "logo-senso-real" },
            { n: "house", src: "logo-house" }, { n: "tailor", src: "logo-tailor" }, { n: "brain", src: "logo-brain" }].
            map((c) =>
            <img key={c.n} src={`assets/img/${c.src}.png`} alt={c.n} className="login-partner" />
            )}
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <div style={{ marginBottom: 24 }}>
            <div className="eyebrow" style={{ color: "#999", marginBottom: 12 }}>// Acesso</div>
            <h2 className="login-title">Bem-vindo<br />de volta.</h2>
          </div>

          <form onSubmit={submit} className="col gap-3">
            <button type="button" onClick={googleLogin} disabled={loading} className="login-sso-btn">
              <Icon name="google" size={18} strokeWidth={1.2} /> Continuar com Google Workspace
            </button>

            <div className="row" style={{ gap: 16, margin: "8px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
              <span style={{ fontSize: 11, color: "#999", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>ou com email</span>
              <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
            </div>

            <div className="col" style={{ gap: 6 }}>
              <label className="login-label">Email corporativo</label>
              <div className="login-input-wrap">
                <input className="login-input has-trail" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="seu.email@grupoom.com.br" autoComplete="email" />
                {emailValid && <span className="login-valid-check"><Icon name="check" size={16} strokeWidth={2.4} /></span>}
              </div>
            </div>

            <div className="col" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="login-label">Senha</label>
                <a style={{ fontSize: 11, color: "#999", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" }}>Esqueci</a>
              </div>
              <div className="login-input-wrap">
                <input className="login-input has-trail" value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={onPwKey} onKeyDown={onPwKey} type={showPw ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" />
                <button type="button" className="login-trail" onClick={() => setShowPw((s) => !s)} title={showPw ? "Ocultar" : "Mostrar"} tabIndex={-1}><Icon name={showPw ? "eye_off" : "eye"} size={17} /></button>
              </div>
              {capsOn && <div className="caps-warn"><Icon name="warn" size={13} /> Caps Lock está ativado</div>}
            </div>

            <div className="row" style={{ justifyContent: "space-between", marginTop: 2 }}>
              <label className="login-remember" onClick={() => setRemember((r) => !r)}>
                <span className={"box " + (remember ? "on" : "")}>{remember && <Icon name="check" size={11} strokeWidth={2.4} />}</span>
                Lembrar meu email
              </label>
            </div>

            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? <><span className="btn-spinner" style={{ borderColor: "rgba(255,255,255,0.5)", borderRightColor: "transparent" }} /> Autenticando…</> : <>Entrar <span className="arr">→</span></>}
            </button>

            {error && <div style={{ padding: "12px 14px", background: "#FEF2F2", color: "#DC2626", borderRadius: 11, fontSize: 13, display: "flex", gap: 8, alignItems: "center", border: "1px solid #FECACA" }}><Icon name="warn" size={14} /> {error}</div>}
          </form>

          <div className="row gap-2" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed #e0ddd4", justifyContent: "center", color: "#999", fontSize: 11.5 }}>
            <Icon name="shield_check" size={13} /> Conexão segura · SSO Google Workspace
          </div>
        </div>

        <div className="login-right-foot">
          <span>© 2026 · Grupo OM</span>
          <span className="tas-sign" title="Desenvolvido pelo TAS"><span style={{ fontFamily: "var(--font-mono)" }}>painelchecking.grupoom.com.br</span><img src="assets/img/gooseblack.png" alt="" className="tas-goose" /></span>
        </div>
      </div>
    </div>);

}
window.ScreenLogin = ScreenLogin;