"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/library", label: "Library" },
  { href: "/vocab", label: "Vocabulary" },
  { href: "/review", label: "Review" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header>
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-1 gap-y-2 px-4 pt-4 pb-3">
        <Link href="/" className="mr-5 flex items-center gap-2.5">
          <Logo size={46} />
          <span className="flex flex-col leading-none">
            <span className="jp !leading-none text-xl tracking-wider">読み書き</span>
            <span className="mt-1 text-[0.7rem] tracking-[0.3em] text-muted">YOMIKAKI</span>
          </span>
        </Link>
        {links.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`relative px-3 py-1.5 text-sm ${active ? "font-medium text-accent" : "text-muted hover:text-foreground"}`}
            >
              {l.label}
              {active && <span aria-hidden className="absolute bottom-0 left-1/2 h-1.5 w-3 -translate-x-1/2 rounded-[100%_0_100%_0] bg-accent" />}
            </Link>
          );
        })}
      </nav>
      {/* A hand-drawn wave instead of a ruler-straight border. */}
      <svg aria-hidden viewBox="0 0 768 8" preserveAspectRatio="none" className="mx-auto block h-2 w-full max-w-3xl px-4 text-border">
        <path d="M0 4C64 0 112 8 192 4S320 0 384 4 512 8 576 4 704 1 768 4" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </header>
  );
}
