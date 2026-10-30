import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { PetalTrail, Sprig } from "@/components/Sprig";

const body = Zen_Maru_Gothic({ variable: "--font-body", weight: ["400", "500", "700"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Yomikaki",
  description: "Turn Japanese reading into lasting vocabulary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} h-full antialiased`}>
      <body className="relative min-h-full flex flex-col overflow-x-hidden">
        <Sprig />
        <div className="relative z-10">
          <Nav />
        </div>
        <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
        <footer className="relative z-10 mx-auto flex w-full max-w-3xl items-end justify-between gap-4 px-4 pb-8 text-xs text-muted">
          <p>
          Dictionary data from{" "}
          <a className="underline" href="https://www.edrdg.org/jmdict/j_jmdict.html">
            JMdict
          </a>{" "}
          (EDRDG, CC BY-SA 4.0).
          </p>
          <PetalTrail />
        </footer>
      </body>
    </html>
  );
}
