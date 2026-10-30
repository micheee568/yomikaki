// A single five-petal sakura petal, tip notched, pointing up from the origin.
export const PETAL = "M0 0C-3.4-2.6-3.6-6.6-1.5-8L0-6.6 1.5-8C3.6-6.6 3.4-2.6 0 0Z";

export function Blossom({ x, y, s, r }: { x: number; y: number; s: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d={PETAL} transform={`rotate(${a})`} fill="var(--blossom)" stroke="var(--blossom-deep)" strokeWidth={0.35} strokeLinejoin="round" />
      ))}
      <circle r={0.9} fill="var(--blossom-deep)" />
    </g>
  );
}

/** A serrated-looking sakura leaf with a midrib, pointing right from the origin. */
export function Leaf({ x, y, s, r }: { x: number; y: number; s: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0C3-5 10-7 18-4 20-3 21-2 22 0 20 3 14 5 8 4 4 3 1 2 0 0Z" fill="var(--leaf)" stroke="var(--leaf-deep)" strokeWidth={0.6} strokeLinejoin="round" />
      <path d="M1 0.4C7 0 14-1 20-0.6" fill="none" stroke="var(--leaf-deep)" strokeWidth={0.5} strokeLinecap="round" />
    </g>
  );
}

export function Drifting({ x, y, s, r }: { x: number; y: number; s: number; r: number }) {
  return <path d={PETAL} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} fill="var(--blossom)" opacity={0.85} />;
}

/**
 * A ring-shaped branch, open at the upper right, with blossoms gathered on the
 * left and a few petals drifting off it.
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="-5 -2 47 44" width={size} height={size} aria-hidden="true" className="shrink-0">
      <g fill="none" stroke="var(--branch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M31 8.2C23.5 4.4 13.5 6.2 8.8 13.4 4.6 20 7.3 30.2 15.2 34.2c6.6 3.3 15.2.6 19-6.2" strokeWidth={1.7} />
        <path d="M8.8 13.4C7.4 11.6 6.4 10.8 4.6 10.4M7.4 28.4C5.8 29.6 4.6 30 3.4 29.8M24 5.6c1.2-1.6 2.6-2.4 4.2-2.6" strokeWidth={1} />
      </g>
      <Leaf x={7.4} y={28.4} s={0.5} r={150} />
      <Leaf x={24} y={5.6} s={0.5} r={-20} />
      <Leaf x={34.2} y={28} s={0.5} r={80} />
      <Blossom x={8.6} y={14.4} s={0.9} r={-12} />
      <Blossom x={5.2} y={23.2} s={1.05} r={20} />
      <Blossom x={13.4} y={7.6} s={0.7} r={35} />
      <Blossom x={10.6} y={31.4} s={0.75} r={-30} />
      <circle cx={4.4} cy={10.3} r={1.1} fill="var(--blossom-deep)" />
      <Drifting x={15} y={21} s={0.5} r={125} />
      <Drifting x={20.5} y={26.5} s={0.42} r={200} />
      <Drifting x={2.4} y={31.5} s={0.4} r={70} />
    </svg>
  );
}
