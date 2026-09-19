const TICKS = Array.from({ length: 36 }, (_, i) => i);

export function Logo() {
  return (
    <div className="flex items-center gap-4">
      <div className="group relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
          <defs>
            <radialGradient id="sealGlass" cx="50%" cy="32%" r="80%">
              <stop offset="0%" stopColor="#1c2946" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#080c16" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0d28a" />
              <stop offset="55%" stopColor="#c9a227" />
              <stop offset="100%" stopColor="#8a6a17" />
            </linearGradient>
            <filter id="sealGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="1.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="60" cy="60" r="56" fill="none" stroke="#c9a227" strokeOpacity="0.18" strokeWidth="1" />

          <g className="animate-seal-spin" style={{ transformOrigin: "center" }}>
            {TICKS.map((i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const long = i % 9 === 0;
              const r1 = long ? 51 : 53;
              const r2 = 57;
              // Arrondi a 2 decimales : evite un mismatch d'hydratation, la
              // representation en chaine d'un flottant complet peut differer
              // de quelques digits entre le rendu serveur et le client.
              const round = (n: number) => Math.round(n * 100) / 100;
              const x1 = round(60 + r1 * Math.cos(angle));
              const y1 = round(60 + r1 * Math.sin(angle));
              const x2 = round(60 + r2 * Math.cos(angle));
              const y2 = round(60 + r2 * Math.sin(angle));
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#c9a227"
                  strokeOpacity={long ? 0.7 : 0.32}
                  strokeWidth={long ? 1.4 : 0.8}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          <circle cx="60" cy="60" r="44" fill="url(#sealGlass)" stroke="url(#goldGrad)" strokeWidth="1.5" />

          <g filter="url(#sealGlow)">
            <circle cx="51" cy="60" r="15" fill="none" stroke="url(#goldGrad)" strokeWidth="2.75" />
            <circle cx="69" cy="60" r="15" fill="none" stroke="url(#goldGrad)" strokeWidth="2.75" />
          </g>

          <circle cx="60" cy="60" r="2.6" fill="#f0d28a" className="animate-seal-pulse" />
        </svg>

        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="animate-seal-shimmer absolute -inset-y-6 left-0 w-1/3 bg-gradient-to-r from-transparent via-gold-bright/50 to-transparent" />
        </div>
      </div>

      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-parchment">Adaptateur</span>
        <span className="font-display text-2xl font-semibold tracking-wide text-ivory">
          ERC<span className="text-gold">·</span>7943
        </span>
      </div>
    </div>
  );
}
