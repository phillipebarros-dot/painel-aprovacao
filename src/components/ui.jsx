// ui.jsx — Primitivas: Icon, Pill, Avatar, Button, Segmented, etc. -> window
const { useState, useRef, useEffect, useMemo, useCallback } = React;

const iconPaths = {
  dashboard:  <><rect x="2.5" y="2.5" width="5" height="7" rx="1.2"/><rect x="2.5" y="11" width="5" height="2.5" rx="1.2"/><rect x="8.5" y="2.5" width="5" height="2.5" rx="1.2"/><rect x="8.5" y="6" width="5" height="7.5" rx="1.2"/></>,
  approvals:  <><path d="M3 3.5h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M5 8.5l2 2 4-4"/></>,
  review:     <><circle cx="7" cy="8" r="4"/><path d="M10 11l3.5 3.5"/></>,
  reports:    <><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M5 10.5V8M8 10.5V6M11 10.5V9"/></>,
  users:      <><circle cx="6" cy="5.5" r="2.4"/><path d="M2 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4"/><circle cx="11.5" cy="6.5" r="1.8"/><path d="M10 13.5c0-1.5 1-2.7 2.5-2.7"/></>,
  operations: <><circle cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3"/></>,
  settings:   <><path d="M8 1.5l1.4 1.5 2.1-.2.4 2.1 1.8 1.1-.8 2 .8 2-1.8 1.1-.4 2.1-2.1-.2L8 14.5l-1.4-1.5-2.1.2-.4-2.1L2.3 10l.8-2-.8-2 1.8-1.1.4-2.1 2.1.2L8 1.5z"/><circle cx="8" cy="8" r="2"/></>,
  search:     <><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></>,
  filter:     <><path d="M2 3.5h12M4 8h8M6 12.5h4"/></>,
  plus:       <><path d="M8 3v10M3 8h10"/></>,
  check:      <><path d="M3 8l3.5 3.5L13 5"/></>,
  x:          <><path d="M4 4l8 8M12 4l-8 8"/></>,
  chevron_right: <><path d="M6 3l5 5-5 5"/></>,
  chevron_down:  <><path d="M3 6l5 5 5-5"/></>,
  chevron_left:  <><path d="M10 3l-5 5 5 5"/></>,
  chevron_up:    <><path d="M3 10l5-5 5 5"/></>,
  arrow_right:   <><path d="M3 8h10M9 4l4 4-4 4"/></>,
  arrow_up_right:<><path d="M4 12l8-8M5 4h7v7"/></>,
  arrow_up:      <><path d="M8 13V3M4 7l4-4 4 4"/></>,
  arrow_down:    <><path d="M8 3v10M4 9l4 4 4-4"/></>,
  info:       <><circle cx="8" cy="8" r="6"/><path d="M8 6v4M8 4.5v.1"/></>,
  warn:       <><path d="M8 2l6.5 12H1.5L8 2z"/><path d="M8 6v3M8 11v.1"/></>,
  download:   <><path d="M8 2v8M4.5 7L8 10.5 11.5 7M2 13h12"/></>,
  upload:     <><path d="M8 13V5M4.5 8L8 4.5 11.5 8M2 13h12"/></>,
  external:   <><path d="M5 3h-2.5v10h10V10.5M9 3h4v4M13 3l-6 6"/></>,
  eye:        <><path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z"/><circle cx="8" cy="8" r="2"/></>,
  eye_off:    <><path d="M6.2 3.3A6.6 6.6 0 0 1 8 3c4 0 6.5 5 6.5 5a12 12 0 0 1-2 2.6M4.3 4.5A12 12 0 0 0 1.5 8s2.5 5 6.5 5a6.5 6.5 0 0 0 2.9-.7"/><path d="M6.6 6.7a2 2 0 0 0 2.8 2.8M2 2l12 12"/></>,
  shield_check: <><path d="M8 1.5l5.5 2v4c0 3.5-2.5 6-5.5 7-3-1-5.5-3.5-5.5-7v-4l5.5-2z"/><path d="M5.5 8l2 2 3-3"/></>,
  image:      <><rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1"/><path d="M2 11l3-3 3 3 2-2 4 4"/></>,
  video:      <><rect x="2" y="3.5" width="9" height="9" rx="1.5"/><path d="M11 6.5l3-2v7l-3-2z"/></>,
  pdf:        <><path d="M4 2.5h5l3 3v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z"/><path d="M9 2.5v3h3"/></>,
  folder:     <><path d="M2 4.5a1 1 0 0 1 1-1h3l1.5 1.5h5.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5z"/></>,
  bell:       <><path d="M4 11.5V8a4 4 0 0 1 8 0v3.5l1 1H3l1-1zM6 13a2 2 0 0 0 4 0"/></>,
  bolt:       <><path d="M9 1.5L3.5 9H8l-1 5.5L12.5 7H8l1-5.5z"/></>,
  logout:     <><path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 5l3 3-3 3M13 8H6"/></>,
  grid:       <><rect x="2" y="2" width="5" height="5" rx=".8"/><rect x="9" y="2" width="5" height="5" rx=".8"/><rect x="2" y="9" width="5" height="5" rx=".8"/><rect x="9" y="9" width="5" height="5" rx=".8"/></>,
  list:       <><path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><circle cx="2.5" cy="4" r=".8" fill="currentColor"/><circle cx="2.5" cy="8" r=".8" fill="currentColor"/><circle cx="2.5" cy="12" r=".8" fill="currentColor"/></>,
  refresh:    <><path d="M13 3v3.5H9.5M3 13v-3.5h3.5"/><path d="M12.5 6.5A5 5 0 0 0 3.6 5.6M3.5 9.5a5 5 0 0 0 8.9 0.9"/></>,
  play:       <path d="M4 3l9 5-9 5z"/>,
  shield:     <><path d="M8 1.5l5.5 2v4c0 3.5-2.5 6-5.5 7-3-1-5.5-3.5-5.5-7v-4l5.5-2z"/><path d="M5.5 8l2 2 3-3"/></>,
  lock:       <><rect x="3.5" y="7" width="9" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></>,
  database:   <><ellipse cx="8" cy="3.5" rx="5.5" ry="2"/><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9"/><path d="M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"/></>,
  more:       <><circle cx="3" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="13" cy="8" r="1" fill="currentColor"/></>,
  clock:      <><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></>,
  calendar:   <><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/></>,
  columns:    <><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M8 2.5v11"/></>,
  panel_left: <><rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M6.5 3v10"/></>,
  layers:     <><path d="M8 2l5.5 3L8 8 2.5 5 8 2z"/><path d="M2.5 8L8 11l5.5-3M2.5 11L8 14l5.5-3"/></>,
  command:    <><path d="M5.5 2.5a2 2 0 1 1-2 2h9a2 2 0 1 1-2-2v9a2 2 0 1 1 2-2h-9a2 2 0 1 1 2 2v-9z"/></>,
  keyboard:   <><rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M4 6.5v.01M6.5 6.5v.01M9 6.5v.01M11.5 6.5v.01M4 9h7.5"/></>,
  trend:      <><path d="M2 11l3.5-3.5 2.5 2.5L13 5"/><path d="M9.5 5H13v3.5"/></>,
  star:       <><path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .73 4.3L8 11.9l-3.82 2 .73-4.3-3.1-3 4.3-.6L8 1.6z"/></>,
  target:     <><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r=".5" fill="currentColor"/></>,
  inbox:      <><path d="M2 9l2-5.5h8L14 9v3.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9z"/><path d="M2 9h3l1 2h4l1-2h3"/></>,
  store:      <><path d="M2.5 6.5V13a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V6.5"/><path d="M1.8 6.5l1-4h10.4l1 4a2 2 0 0 1-3.8 1 2 2 0 0 1-3.8 0 2 2 0 0 1-3.8 0 2 2 0 0 1-1-1z"/><path d="M6.5 13.5v-3h3v3"/></>,
  sun:        <><circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M13 3l-1.1 1.1M4.1 11.9 3 13"/></>,
  moon:       <><path d="M13 9.4A5.2 5.2 0 1 1 6.6 3 4 4 0 0 0 13 9.4z"/></>,
  google:     <><path d="M14.5 8c0-.5-.05-1-.13-1.5H8v3h3.7c-.16.9-.65 1.65-1.4 2.16v1.8h2.27c1.32-1.22 2.08-3.02 2.08-5.46z" fill="#4285F4"/><path d="M8 14.5c1.89 0 3.48-.62 4.64-1.7L10.3 11c-.65.43-1.47.69-2.3.69-1.77 0-3.27-1.2-3.8-2.81H1.78v1.81A6.99 6.99 0 0 0 8 14.5z" fill="#34A853"/><path d="M4.2 8.88a4.2 4.2 0 0 1 0-2.76V4.3H1.78a7 7 0 0 0 0 6.4l2.42-1.82z" fill="#FBBC05"/><path d="M8 4.43c1 0 1.9.34 2.6 1.02L12.65 3.4A6.97 6.97 0 0 0 8 1.5a6.99 6.99 0 0 0-6.22 3.8L4.2 7.12c.53-1.6 2.03-2.81 3.8-2.81z" fill="#EA4335"/></>,
};

const Icon = ({ name, size = 16, className = "ico", style = {}, strokeWidth = 1.5 }) => {
  const p = iconPaths[name];
  if (!p) return null;
  const isGoogle = name === "google";
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} style={style}
         fill={isGoogle ? "currentColor" : "none"} stroke={isGoogle ? "none" : "currentColor"}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{p}</svg>
  );
};

const Pill = ({ status, children, className = "" }) => {
  const map = {
    pending: "pill-pending", approved: "pill-approved", rejected: "pill-rejected",
    neutral: "pill-neutral", info: "pill-info", admin: "pill-admin",
  };
  const labels = { pending: "Pendente", approved: "Aprovado", rejected: "Reprovado" };
  return <span className={`pill ${map[status] || "pill-neutral"} ${className}`}><span className="dot"></span>{children || labels[status]}</span>;
};

const Avatar = ({ user, size = 28, online = false, ring = false }) => {
  const u = typeof user === "string" ? { nome: user, color: "#4B4842" } : user;
  const bg = u?.color || '#4B4842';
  const avatarUrl = u?.avatar && u.avatar.startsWith("http") ? u.avatar : null;
  const initials = (u?.nome || u?.name || '?').split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const [imgErr, setImgErr] = React.useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <span className={"avatar " + (ring ? "ring" : "")} title={u?.nome || u?.name || ''}
        style={{ width: size, height: size, background: avatarUrl && !imgErr ? "transparent" : bg, fontSize: size <= 24 ? 9.5 : size <= 30 ? 11 : 13, fontWeight: 600, display: 'grid', overflow: 'hidden' }}>
        {avatarUrl && !imgErr
          ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} onError={() => setImgErr(true)}/>
          : initials}
      </span>
      {online && <span style={{ position: "absolute", bottom: -1, right: -1, width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28), borderRadius: 99, background: "#22c55e", boxShadow: "0 0 0 2px var(--bg)" }}/>}
    </span>
  );
};

// Button with ripple + loading
const Button = ({ variant = "ghost", size = "md", icon, iconRight, children, onClick, disabled, loading, type = "button", style }) => {
  const [ripples, setRipples] = useState([]);
  const handle = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const id = Date.now() + Math.random();
    setRipples(p => [...p, { id, x: e.clientX - r.left - d / 2, y: e.clientY - r.top - d / 2, d }]);
    setTimeout(() => setRipples(p => p.filter(x => x.id !== id)), 600);
    if (onClick) onClick(e);
  };
  const cls = `btn btn-${variant} ${size === "sm" ? "sm" : size === "lg" ? "lg" : ""}`;
  return (
    <button className={cls} onClick={handle} disabled={disabled || loading} type={type} style={style}>
      {loading ? <span className="btn-spinner"/> : icon && <Icon name={icon}/>}
      {children}
      {iconRight && !loading && <Icon name={iconRight}/>}
      {ripples.map(r => <span key={r.id} className="ripple" style={{ left: r.x, top: r.y, width: r.d, height: r.d }}/>)}
    </button>
  );
};

const Segmented = ({ value, onChange, options }) => {
  const ref = useRef(null);
  const [thumb, setThumb] = useState({ left: 2, width: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const idx = options.findIndex(o => o.value === value);
    const btn = ref.current.children[idx + 1]; // +1 for thumb
    if (btn) setThumb({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [value, options]);
  return (
    <div className="seg" ref={ref}>
      <span className="seg-thumb" style={{ left: thumb.left, width: thumb.width }}/>
      {options.map(opt => (
        <button key={typeof opt.value === 'object' ? JSON.stringify(opt.value) : opt.value}
          className={value === opt.value ? "on" : ""} onClick={() => onChange(opt.value)}>{opt.label}</button>
      ))}
    </div>
  );
};

const SearchInput = ({ value, onChange, placeholder = "Buscar…", style = {} }) => (
  <div className="input-wrap" style={style}>
    <Icon name="search"/>
    <input className="input search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}/>
  </div>
);

const Empty = ({ title, hint, icon = "search" }) => (
  <div className="empty-wrap">
    <div className="empty-ico"><Icon name={icon} size={20}/></div>
    <div style={{ fontSize: 15, color: "var(--ink-2)", marginBottom: 4 }}>{title}</div>
    {hint && <div style={{ fontSize: 13 }}>{hint}</div>}
  </div>
);

const NumDot = ({ n, accent = false }) => <span className={"numdot " + (accent ? "accent" : "")}>{n}</span>;

const Toggle = ({ on, onClick }) => (
  <button className={"toggle " + (on ? "on" : "")} onClick={onClick}><span className="knob"/></button>
);

// Count-up hook
function useCountUp(target, dur = 1000, deps = []) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    let raf; const from = prev.current; const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ...deps]);
  return val;
}
const CountUp = ({ value, format, dur = 1100 }) => {
  const safeValue = (value == null || isNaN(value)) ? 0 : Number(value);
  const v = useCountUp(safeValue, dur, [safeValue]);
  const sv = isNaN(v) ? 0 : v;
  if (format) return <>{format(sv)}</>;
  // Preservar casas decimais do valor original (ex: 99.6 nao pode virar 100)
  const dec = String(safeValue).includes('.') ? (String(safeValue).split('.')[1] || '').length : 0;
  return <>{dec > 0 ? sv.toFixed(dec) : Math.round(sv)}</>;
};

Object.assign(window, { Icon, Pill, Avatar, Button, Segmented, SearchInput, Empty, NumDot, Toggle, useCountUp, CountUp });

// Export menu (CSV / PDF)
function ExportMenu({ onCsv, onPdf, onXlsx, label = "Exportar" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button variant="ghost" icon="download" iconRight="chevron_down" onClick={() => setOpen(o => !o)}>{label}</Button>
      {open && (
        <div className="dropdown" style={{ top: 42, right: 0, minWidth: 180 }}>
          <div className="dropdown-item" onClick={() => { setOpen(false); onCsv && onCsv(); }}><Icon name="reports" size={15}/><span>Exportar CSV</span></div>
          {onXlsx && <div className="dropdown-item" onClick={() => { setOpen(false); onXlsx(); }}><Icon name="reports" size={15}/><span>Exportar Excel</span></div>}
          <div className="dropdown-item" onClick={() => { setOpen(false); onPdf && onPdf(); }}><Icon name="pdf" size={15}/><span>Exportar PDF</span></div>
        </div>
      )}
    </div>
  );
}
window.ExportMenu = ExportMenu;

// Flag do publi: Ok (verde) / Com Problema (amarelo) / Falha (vermelho)
function PubliFlag({ sit, compact }) {
  const map = { S: ["Ok", "var(--accent)", "var(--accent-soft)"], P: ["Com problema", "var(--warn)", "var(--warn-soft)"], N: ["Falha", "var(--alert)", "var(--alert-soft)"] };
  const [label, color, soft] = map[sit] || map.S;
  if (compact) return <span className="publi-flag" title={"Liberado no publi: " + label} style={{ background: color }}/>;
  return <span className="pill" style={{ background: soft, color, border: "1px solid " + color }}><span className="publi-flag" style={{ background: color }}/>{label}</span>;
}
window.PubliFlag = PubliFlag;
