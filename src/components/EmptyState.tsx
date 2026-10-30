import { Blossom, Drifting, Leaf } from "@/components/Logo";

/** A short branch with one open blossom and a bud, for pages with nothing on them yet. */
function TwigIllustration() {
  return (
    <svg aria-hidden viewBox="0 0 140 70" className="mx-auto h-16 w-32">
      <g fill="none" stroke="var(--branch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 52C34 48 56 40 84 30 100 24 114 24 130 16" strokeWidth={2.6} />
        <path d="M58 41C60 52 54 60 46 64M96 27C94 38 100 44 108 46" strokeWidth={1.4} />
      </g>
      <Leaf x={36} y={48} s={0.8} r={-35} />
      <Leaf x={70} y={36} s={0.7} r={-30} />
      <Blossom x={96} y={27} s={2} r={15} />
      <Blossom x={124} y={18} s={1.5} r={-20} />
      <circle cx={46} cy={64} r={2.6} fill="var(--blossom-deep)" />
      <circle cx={108} cy={46} r={2} fill="var(--blossom)" stroke="var(--blossom-deep)" strokeWidth={0.6} />
      <Drifting x={80} y={56} s={1} r={140} />
      <Drifting x={118} y={52} s={0.8} r={40} />
      <Drifting x={22} y={30} s={0.8} r={200} />
    </svg>
  );
}

export function EmptyState({ title, children, petals = false }: { title?: string; children: React.ReactNode; petals?: boolean }) {
  return (
    <div className="relative overflow-hidden py-8 text-center">
      {petals && <FallingPetals />}
      <TwigIllustration />
      {title && <p className="jp mt-3 !leading-snug text-xl">{title}</p>}
      <div className="mt-2 text-muted">{children}</div>
    </div>
  );
}

const FALL = [
  { left: "8%", delay: "0s", dur: "7s", s: 1.4 },
  { left: "22%", delay: "1.8s", dur: "9s", s: 1 },
  { left: "38%", delay: "0.6s", dur: "8s", s: 1.2 },
  { left: "55%", delay: "3s", dur: "10s", s: 0.9 },
  { left: "70%", delay: "1.2s", dur: "7.5s", s: 1.3 },
  { left: "86%", delay: "2.4s", dur: "9.5s", s: 1.1 },
];

/** Petals drifting down; the animation is skipped for people who prefer reduced motion. */
function FallingPetals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {FALL.map((p, i) => (
        <svg
          key={i}
          viewBox="-5 -9 10 10"
          className="petal-fall absolute -top-4 h-4 w-4"
          style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur, scale: p.s }}
        >
          <Drifting x={0} y={0} s={1} r={0} />
        </svg>
      ))}
    </div>
  );
}
