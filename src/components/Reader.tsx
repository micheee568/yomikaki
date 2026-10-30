"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ErrorNote } from "@/components/ui";
import { api } from "@/lib/api";
import { defaultMeaning, entryReading } from "@/lib/dictionary/defaults";
import type { DictionaryResult } from "@/lib/dictionary/lookup";
import { sentenceAround } from "@/lib/text/sentence";
import type { Token } from "@/lib/text/normalize";

export interface ReadingData {
  id: string;
  title: string;
  tokens: Token[];
  savedTerms: string[];
  progress: { position: number } | null;
}

interface BulkSaveResponse {
  saved: number;
  notFound: number;
  savedTerms: string[];
}

interface SaveResponse {
  created: boolean;
  contextAdded: boolean;
}

export function Reader({ reading }: { reading: ReadingData }) {
  const { tokens } = reading;
  const [saved, setSaved] = useState(() => new Set(reading.savedTerms));
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<DictionaryResult[] | null>(null);
  const [choice, setChoice] = useState(0);
  const [meaning, setMeaning] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const furthest = useRef(reading.progress?.position ?? 0);
  const latestLookup = useRef(0);

  // Resume where the reader left off.
  useEffect(() => {
    const pos = reading.progress?.position ?? 0;
    if (pos > 0) document.getElementById(`t-${pos}`)?.scrollIntoView({ block: "center" });
  }, [reading.progress?.position]);

  const close = useCallback(() => setSelected(null), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const token = selected === null ? null : tokens[selected];

  const select = useCallback(
    async (index: number) => {
      const t = tokens[index];
      setSelected(index);
      setResults(null);
      setChoice(0);
      setMeaning("");
      setStatus(null);
      setError(null);

      if (index > furthest.current) {
        furthest.current = index;
        api(`/api/readings/${reading.id}/progress`, { method: "PUT", json: { position: index } }).catch(() => {});
      }

      const requestId = ++latestLookup.current;
      try {
        const qs = new URLSearchParams({ baseForm: t.baseForm, surface: t.surface, reading: t.reading, pos: t.pos });
        const found = await api<DictionaryResult[]>(`/api/lookup?${qs}`);
        if (requestId !== latestLookup.current) return; // a newer click superseded this one
        setResults(found);
        setMeaning(found[0] ? defaultMeaning(found[0]) : "");
      } catch (err) {
        if (requestId !== latestLookup.current) return;
        setResults([]);
        setError((err as Error).message);
      }
    },
    [tokens, reading.id],
  );

  function pick(i: number) {
    setChoice(i);
    if (results?.[i]) setMeaning(defaultMeaning(results[i]));
  }

  async function save() {
    if (selected === null || !token) return;
    const entry = results?.[choice];
    setSaving(true);
    setError(null);
    try {
      const res = await api<SaveResponse>("/api/vocab", {
        method: "POST",
        json: {
          term: token.baseForm,
          reading: entry ? entryReading(entry, token) : token.reading,
          meaning,
          partOfSpeech: entry?.senses[0]?.pos[0],
          dictionaryEntryId: entry?.id,
          readingId: reading.id,
          sentence: sentenceAround(tokens, selected),
          surfaceForm: token.surface,
        },
      });
      setSaved((s) => new Set(s).add(token.baseForm));
      setStatus(res.created ? "Saved to your vocabulary." : res.contextAdded ? "Already saved — added this sentence." : "Already saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveAllUnknown() {
    setBulkSaving(true);
    setBulkStatus(null);
    setError(null);
    try {
      const res = await api<BulkSaveResponse>(`/api/readings/${reading.id}/save-unknown`, { method: "POST" });
      setSaved((s) => new Set([...s, ...res.savedTerms]));
      const parts = [`Saved ${res.saved} new ${res.saved === 1 ? "word" : "words"}.`];
      if (res.notFound > 0) parts.push(`${res.notFound} had no dictionary entry and were skipped.`);
      setBulkStatus(parts.join(" "));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBulkSaving(false);
    }
  }

  const body = useMemo(
    () =>
      tokens.map((t, i) => {
        if (t.surface === "\n") return <br key={i} />;
        if (!t.isWord) return <span key={i}>{t.surface}</span>;
        const isSaved = saved.has(t.baseForm);
        return (
          <button
            key={i}
            id={`t-${i}`}
            type="button"
            onClick={() => select(i)}
            className={`rounded-sm px-px hover:bg-accent-soft ${selected === i ? "bg-accent-soft text-accent" : ""} ${isSaved ? "underline decoration-accent decoration-2 underline-offset-4" : ""}`}
          >
            {t.surface}
          </button>
        );
      }),
    [tokens, saved, selected, select],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button onClick={saveAllUnknown} disabled={bulkSaving}>
          {bulkSaving ? "Saving…" : "Save all unknown words"}
        </Button>
        {bulkStatus && <p className="text-sm text-good">{bulkStatus}</p>}
      </div>

      <article className="jp text-xl" lang="ja">
        {body}
      </article>

      {token && (
        <aside
          role="dialog"
          aria-label="Word details"
          className="fixed inset-x-0 bottom-0 z-10 max-h-[60vh] overflow-y-auto border-t border-border bg-surface shadow-2xl"
        >
          <div className="mx-auto max-w-3xl space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="jp text-2xl leading-tight">{token.surface}</p>
                <p className="text-sm text-muted">
                  {token.reading}
                  {token.baseForm !== token.surface && <> · dictionary form: <span className="jp">{token.baseForm}</span></>}
                </p>
              </div>
              <button onClick={close} aria-label="Close" className="text-muted hover:text-foreground">
                ✕
              </button>
            </div>

            {results === null && <p className="text-sm text-muted">Looking up…</p>}
            {results?.length === 0 && <p className="text-sm text-muted">No dictionary entry found. You can still save it with your own meaning.</p>}

            <ul className="space-y-2">
              {results?.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    aria-pressed={choice === i}
                    className={`w-full rounded-2xl border p-3 text-left ${choice === i ? "border-accent bg-accent-soft" : "border-border"}`}
                  >
                    <p className="jp leading-snug">
                      <span className="font-medium">{r.kanji[0] ?? r.kana[0]}</span>
                      {r.kanji[0] && <span className="ml-2 text-sm text-muted">【{r.kana.join("、")}】</span>}
                      {r.isCommon && <span className="ml-2 rounded bg-border px-1.5 text-xs">common</span>}
                    </p>
                    <ol className="mt-1 list-inside list-decimal text-sm">
                      {r.senses.slice(0, 4).map((s, k) => (
                        <li key={k}>
                          {s.glosses.slice(0, 3).join("; ")}
                          <span className="ml-1 text-xs text-muted">({s.pos.join(", ")})</span>
                        </li>
                      ))}
                    </ol>
                  </button>
                </li>
              ))}
            </ul>

            <ErrorNote message={error} />

            {results !== null && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  aria-label="Meaning to save"
                  placeholder="Meaning"
                  className="flex-1 rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                />
                <Button onClick={save} disabled={saving || !meaning.trim()}>
                  {saving ? "Saving…" : saved.has(token.baseForm) ? "Add this sentence" : "Save word"}
                </Button>
              </div>
            )}
            {status && <p className="text-sm text-good">{status}</p>}
          </div>
        </aside>
      )}
    </>
  );
}
