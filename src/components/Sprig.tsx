import { Blossom, Drifting, Leaf } from "@/components/Logo";

/** A blossoming branch reaching in from the top-right corner of the page. */
export function Sprig() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 280 170"
      className="pointer-events-none absolute top-0 right-0 -z-0 w-[min(60vw,300px)] opacity-60 sm:opacity-90"
    >
      <g fill="none" stroke="var(--branch)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M284 4C242 12 206 30 172 52 148 68 120 74 92 92" strokeWidth={3.4} />
        <path d="M205 30C196 44 182 52 176 66M172 52C168 38 150 30 138 32M120 76C112 90 100 96 88 112M240 14C236 26 228 34 218 38M150 62C156 74 152 84 144 92" strokeWidth={1.6} />
      </g>
      <Leaf x={186} y={40} s={0.9} r={60} />
      <Leaf x={152} y={59} s={0.8} r={110} />
      <Leaf x={112} y={82} s={0.85} r={125} />
      <Leaf x={232} y={20} s={0.75} r={40} />
      <Leaf x={144} y={92} s={0.7} r={95} />
      <Blossom x={205} y={30} s={2.6} r={10} />
      <Blossom x={176} y={66} s={2.1} r={-25} />
      <Blossom x={138} y={32} s={2.3} r={30} />
      <Blossom x={92} y={92} s={2.7} r={-8} />
      <Blossom x={88} y={112} s={1.7} r={50} />
      <Blossom x={218} y={38} s={1.9} r={-40} />
      <Blossom x={252} y={10} s={1.8} r={20} />
      <circle cx={144} cy={92} r={3.4} fill="var(--blossom-deep)" />
      <circle cx={150} cy={96} r={2.2} fill="var(--blossom)" stroke="var(--blossom-deep)" strokeWidth={0.6} />
      <Drifting x={64} y={118} s={1.5} r={130} />
      <Drifting x={40} y={142} s={1.3} r={210} />
      <Drifting x={118} y={128} s={1.2} r={60} />
      <Drifting x={22} y={104} s={1.1} r={170} />
      <Drifting x={80} y={152} s={1} r={20} />
    </svg>
  );
}

/** A little trail of petals, used to close the page. */
export function PetalTrail() {
  return (
    <svg aria-hidden viewBox="0 0 120 30" className="h-7 w-28 text-transparent">
      <Drifting x={10} y={20} s={1.2} r={140} />
      <Drifting x={36} y={9} s={0.9} r={60} />
      <Drifting x={62} y={22} s={1.1} r={200} />
      <Drifting x={88} y={11} s={0.8} r={110} />
      <Drifting x={110} y={21} s={1} r={20} />
    </svg>
  );
}
