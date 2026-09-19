export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <div
        className="animate-seal-spin absolute inset-0 opacity-[0.04]"
        style={{
          animationDuration: "180s",
          backgroundImage:
            "repeating-conic-gradient(from 0deg, rgba(201,162,39,0.6) 0deg 0.4deg, transparent 0.4deg 6deg)",
        }}
      />
      <div
        className="absolute -left-1/4 top-[-10%] h-[70vmax] w-[70vmax] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-gold) 22%, transparent) 0%, transparent 65%)",
          animation: "aurora-drift-a 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-1/4 bottom-[-15%] h-[65vmax] w-[65vmax] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, #274a7a 55%, transparent) 0%, transparent 65%)",
          animation: "aurora-drift-b 32s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/60" />
    </div>
  );
}
