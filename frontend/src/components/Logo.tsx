const TICKS = Array.from({ length: 36 }, (_, i) => i);
const GUILLOCHE_RADII = [46, 48.4, 50.8];

const round = (n: number) => Math.round(n * 100) / 100;

function sparklePath(cx: number, cy: number, size: number): string {
  const p = (n: number) => round(n);
  return `M ${p(cx)} ${p(cy - size)} Q ${p(cx + size * 0.25)} ${p(cy - size * 0.25)} ${p(cx + size)} ${p(cy)} Q ${p(
    cx + size * 0.25,
  )} ${p(cy + size * 0.25)} ${p(cx)} ${p(cy + size)} Q ${p(cx - size * 0.25)} ${p(cy + size * 0.25)} ${p(cx - size)} ${p(
    cy,
  )} Q ${p(cx - size * 0.25)} ${p(cy - size * 0.25)} ${p(cx)} ${p(cy - size)} Z`;
}

export function Logo() {
  return (
    <div className="flex items-center gap-4">
      <div
        className="group relative h-16 w-16 shrink-0"
        style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(201,162,39,0.12))" }}
      >
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
          <defs>
            <radialGradient id="sealGlass" cx="50%" cy="32%" r="80%">
              <stop offset="0%" stopColor="#1c2946" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#080c16" stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8e2ad" />
              <stop offset="45%" stopColor="#c9a227" />
              <stop offset="100%" stopColor="#8a6a17" />
            </linearGradient>
            <radialGradient id="gemGrad" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#fff3d6" />
              <stop offset="45%" stopColor="#f0d28a" />
              <stop offset="100%" stopColor="#a67e1f" />
            </radialGradient>
            <filter id="sealGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="1.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* limite exterieure */}
          <circle cx="60" cy="60" r="56" fill="none" stroke="#c9a227" strokeOpacity="0.18" strokeWidth="1" />

          {/* bezel a graduations, rotation lente */}
          <g className="animate-seal-spin" style={{ transformOrigin: "center" }}>
            {TICKS.map((i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const long = i % 9 === 0;
              const r1 = long ? 51 : 53;
              const r2 = 57;
              // Arrondi a 2 decimales : evite un mismatch d'hydratation, la
              // representation en chaine d'un flottant complet peut differer
              // de quelques digits entre le rendu serveur et le client.
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

          {/* fine gravure guillochee, statique, entre le bezel et le sceau */}
          {GUILLOCHE_RADII.map((r) => (
            <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="#c9a227" strokeOpacity="0.14" strokeWidth="0.5" />
          ))}

          {/* plaque du sceau */}
          <circle cx="60" cy="60" r="44" fill="url(#sealGlass)" stroke="url(#goldGrad)" strokeWidth="1.5" />

          {/* deux anneaux entrelaces : l'adaptateur reliant deux standards, leger balancement mecanique */}
          <g className="animate-seal-oscillate" style={{ transformOrigin: "60px 60px" }} filter="url(#sealGlow)">
            <circle cx="51" cy="60" r="15" fill="none" stroke="url(#goldGrad)" strokeWidth="2.75" />
            <circle cx="69" cy="60" r="15" fill="none" stroke="url(#goldGrad)" strokeWidth="2.75" />
          </g>

          {/* joyau central a l'intersection des anneaux */}
          <g className="animate-gem-glint" style={{ transformOrigin: "60px 60px" }}>
            <path d="M 60 55.5 L 64.5 60 L 60 64.5 L 55.5 60 Z" fill="url(#gemGrad)" stroke="#8a6a17" strokeWidth="0.4" />
            <path d="M 60 56.6 L 61.6 60 L 60 61.4 L 58.6 60 Z" fill="#fff8e6" opacity="0.55" />
          </g>

          {/* eclats scintillants autour du sceau */}
          <path d={sparklePath(31, 34, 2.4)} fill="#f0d28a" className="animate-sparkle-1" style={{ transformOrigin: "31px 34px" }} />
          <path d={sparklePath(90, 40, 1.8)} fill="#f0d28a" className="animate-sparkle-2" style={{ transformOrigin: "90px 40px" }} />
          <path d={sparklePath(84, 88, 2)} fill="#f0d28a" className="animate-sparkle-3" style={{ transformOrigin: "84px 88px" }} />
        </svg>

        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="animate-seal-shimmer absolute -inset-y-6 left-0 w-1/3 bg-gradient-to-r from-transparent via-gold-bright/50 to-transparent" />
        </div>
      </div>

      <div className="flex flex-col leading-none">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.4em] text-parchment">
          <span className="text-gold/70">◆</span> Adaptateur <span className="text-gold/70">◆</span>
        </span>
        <span className="font-display mt-1 text-2xl font-semibold tracking-wide text-ivory">
          ERC<span className="text-gold">·</span>7943
        </span>
        <span className="mt-1 h-px w-full bg-gradient-to-r from-gold/70 via-gold/20 to-transparent" />
      </div>
    </div>
  );
}
