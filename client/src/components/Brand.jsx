/** The animated page background: ruled grid, drifting colour glows and a mouse spotlight. */
export function Backdrop() {
  return (
    <div className="app-backdrop" aria-hidden>
      <div className="backdrop-grid" />
      <div className="glow glow-blue" />
      <div className="glow glow-amber" />
      <div className="glow glow-green" />
      <div className="backdrop-spotlight" />
    </div>
  );
}

/** The Cardfile index-card logo - the same mark as the home page and the favicon. */
export function Logo({ inverted = false, className = '' }) {
  const card = inverted ? '#ffffff' : '#18233d';
  const lines = inverted ? '#18233d' : '#ffffff';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect x="3" y="7" width="26" height="20" rx="3" fill={card} />
        <rect x="7" y="4" width="9" height="6" rx="2" fill="#2F5BD3" />
        <rect x="3" y="11" width="26" height="2" fill="#D2453D" />
        <rect x="8" y="17" width="16" height="1.6" rx=".8" fill={lines} opacity=".55" />
        <rect x="8" y="21" width="11" height="1.6" rx=".8" fill={lines} opacity=".55" />
      </svg>
      <span className="text-[19px] font-extrabold tracking-[-0.03em]">Cardfile</span>
    </span>
  );
}
