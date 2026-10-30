"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Reader, type ReadingData } from "@/components/Reader";
import { ErrorNote } from "@/components/ui";
import { api } from "@/lib/api";

export default function ReadPage() {
  const { id } = useParams<{ id: string }>();
  const [reading, setReading] = useState<ReadingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ReadingData & { status: string; error: string | null }>(`/api/readings/${id}`).then((r) => {
      if (r.status === "FAILED") setError(r.error ?? "This reading could not be processed.");
      else setReading(r);
    }, (e: Error) => setError(e.message));
  }, [id]);

  return (
    <div className="space-y-6 pb-[40vh]">
      <Link href="/library" className="text-sm text-muted hover:text-foreground">
        ← Library
      </Link>
      {error && <ErrorNote message={error} />}
      {!reading && !error && <p className="text-muted">Loading…</p>}
      {reading && (
        <>
          <h1 className="text-2xl font-semibold">{reading.title}</h1>
          <Reader reading={reading} />
        </>
      )}
    </div>
  );
}
