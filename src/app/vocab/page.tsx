"use client";

import { EmptyState } from "@/components/EmptyState";
import { useCallback, useEffect, useState } from "react";
import { ErrorNote } from "@/components/ui";
import { api } from "@/lib/api";

interface VocabItem {
  id: string;
  term: string;
  reading: string;
  meaning: string;
  partOfSpeech: string | null;
  contexts: { id: string; sentence: string; surfaceForm: string }[];
  reviewState: { state: string; dueAt: string; intervalDays: number } | null;
}

const STATE_LABEL: Record<string, string> = { NEW: "new", LEARNING: "learning", REVIEW: "review", RELEARNING: "relearning" };

export default function VocabPage() {
  const [items, setItems] = useState<VocabItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((q: string) => {
    api<VocabItem[]>(`/api/vocab?q=${encodeURIComponent(q)}`).then(setItems, (e: Error) => setError(e.message));
  }, []);

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(query), 200);
    return () => clearTimeout(t);
  }, [query, load]);

  async function remove(item: VocabItem) {
    if (!confirm(`Delete "${item.term}" and its review history?`)) return;
    try {
      await api(`/api/vocab/${item.id}`, { method: "DELETE" });
      load(query);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Vocabulary{items && <span className="ml-2 text-base font-normal text-muted">{items.length}</span>}</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words or meanings"
          aria-label="Search vocabulary"
          className="w-64 rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <ErrorNote message={error} />

      {items === null ? (
        <p className="text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState title={query ? "No matches" : "No words saved yet"}>{query ? "Try a different spelling or part of the meaning." : "Click a word while reading to save it."}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((v) => (
            <li key={v.id} className="petal border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="jp text-xl leading-snug">
                    {v.term}
                    {v.reading !== v.term && <span className="ml-2 text-sm text-muted">{v.reading}</span>}
                  </p>
                  <p className="text-sm">{v.meaning}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {v.reviewState && <span className="rounded bg-border px-2 py-0.5 text-xs">{STATE_LABEL[v.reviewState.state]}</span>}
                  <button onClick={() => remove(v)} className="text-xs text-muted hover:text-red-600" aria-label={`Delete ${v.term}`}>
                    Delete
                  </button>
                </div>
              </div>
              {v.contexts.length > 0 && (
                <ul className="jp mt-2 space-y-1 border-l-2 border-border pl-3 text-sm leading-relaxed text-muted">
                  {v.contexts.slice(0, 3).map((c) => (
                    <li key={c.id}>{c.sentence}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
