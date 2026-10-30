"use client";

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, ErrorNote } from "@/components/ui";
import { api } from "@/lib/api";
import { MAX_READING_CHARS } from "@/lib/validation";

interface ReadingItem {
  id: string;
  title: string;
  status: "PROCESSING" | "READY" | "FAILED";
  updatedAt: string;
  percentRead: number;
}

export default function LibraryPage() {
  const [readings, setReadings] = useState<ReadingItem[] | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<ReadingItem[]>("/api/readings").then(setReadings, (e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/readings", { method: "POST", json: { title, content } });
      setTitle("");
      setContent("");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this reading? Saved words are kept.")) return;
    try {
      await api(`/api/readings/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Library</h1>

      <Card>
        <form onSubmit={create} className="space-y-3">
          <h2 className="font-medium">Add a reading</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            aria-label="Title"
            maxLength={200}
            className="w-full rounded-2xl border border-border bg-background px-3 py-2"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste Japanese text here…"
            aria-label="Japanese text"
            rows={6}
            className="jp w-full rounded-2xl border border-border bg-background px-3 py-2"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              {content.length.toLocaleString()} / {MAX_READING_CHARS.toLocaleString()}
            </span>
            <Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
              {saving ? "Processing…" : "Add reading"}
            </Button>
          </div>
        </form>
      </Card>

      <ErrorNote message={error} />

      <section>
        {readings === null ? (
          <p className="text-muted">Loading…</p>
        ) : readings.length === 0 ? (
          <EmptyState title="Nothing to read yet">Paste some Japanese above to get started.</EmptyState>
        ) : (
          <ul className="divide-y divide-border petal border border-border bg-surface">
            {readings.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <Link href={`/read/${r.id}`} className="flex-1 hover:underline">
                  <span className="font-medium">{r.title}</span>
                  {r.status === "FAILED" && <span className="ml-2 text-xs text-red-600">failed to process</span>}
                  <span className="ml-2 text-xs text-muted">{r.percentRead}% read</span>
                </Link>
                <button onClick={() => remove(r.id)} className="text-xs text-muted hover:text-red-600" aria-label={`Delete ${r.title}`}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
