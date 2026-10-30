"use client";

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { useEffect, useState } from "react";
import { Card, ErrorNote } from "@/components/ui";
import { api, tzOffsetMinutes } from "@/lib/api";

interface Stats {
  dueToday: number;
  totalCards: number;
  newWords7d: number;
  reviewsLast30d: number;
  accuracy30d: number | null;
  streak: number;
  reviewedToday: number;
  recentReadings: { id: string; title: string; lastReadAt: string }[];
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 jp !leading-tight text-4xl font-medium tabular-nums text-accent">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>(`/api/stats?tz=${tzOffsetMinutes()}`).then(setStats, (e: Error) => setError(e.message));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!stats) return <p className="text-muted">Loading…</p>;

  const accuracy = stats.accuracy30d === null ? "–" : `${Math.round(stats.accuracy30d * 100)}%`;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="mt-1 text-muted">
          {stats.dueToday > 0 ? (
            <>
              {stats.dueToday} card{stats.dueToday === 1 ? "" : "s"} due.{" "}
              <Link href="/review" className="font-medium text-accent underline">
                Start reviewing
              </Link>
            </>
          ) : (
            "Nothing due. Read something new to find more words."
          )}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile label="Due today" value={stats.dueToday} />
        <Tile label="New words (7d)" value={stats.newWords7d} hint={`${stats.totalCards} saved in total`} />
        <Tile label="Accuracy (30d)" value={accuracy} hint={`${stats.reviewsLast30d} reviews`} />
        <Tile label="Streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} hint={stats.reviewedToday ? "Reviewed today" : "Review to keep it going"} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recently read</h2>
        {stats.recentReadings.length === 0 ? (
          <EmptyState title="No readings yet">
            <Link href="/library" className="text-accent underline">
              Add your first text
            </Link>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border petal border border-border bg-surface">
            {stats.recentReadings.map((r) => (
              <li key={r.id}>
                <Link href={`/read/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-accent-soft">
                  <span>{r.title}</span>
                  <span className="text-xs text-muted">{new Date(r.lastReadAt).toLocaleDateString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
