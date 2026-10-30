"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Button, Card, ErrorNote } from "@/components/ui";
import { api } from "@/lib/api";

type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

interface DueCard {
  vocabularyId: string;
  term: string;
  reading: string;
  meaning: string;
  partOfSpeech: string | null;
  state: string;
  context: { sentence: string; surfaceForm: string } | null;
  nextIntervals: Record<Rating, string>;
}

interface DueResponse {
  dueTotal: number;
  cards: DueCard[];
}

const BUTTONS: { rating: Rating; label: string; key: string; style: string }[] = [
  { rating: "AGAIN", label: "Again", key: "1", style: "border-red-300 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950" },
  { rating: "HARD", label: "Hard", key: "2", style: "border-border hover:bg-accent-soft" },
  { rating: "GOOD", label: "Good", key: "3", style: "border-border hover:bg-accent-soft" },
  { rating: "EASY", label: "Easy", key: "4", style: "border-green-300 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-950" },
];

/** The sentence with the studied word picked out, so the card tests the word in context. */
function Sentence({ sentence, word }: { sentence: string; word: string }) {
  const at = sentence.indexOf(word);
  if (at < 0) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, at)}
      <mark className="rounded bg-accent-soft px-0.5 text-accent">{word}</mark>
      {sentence.slice(at + word.length)}
    </>
  );
}

export default function ReviewPage() {
  const [queue, setQueue] = useState<DueCard[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(0);

  const apply = useCallback((res: DueResponse) => {
    setQueue(res.cards);
    setRemaining(res.dueTotal);
    setRevealed(false);
    shownAt.current = Date.now();
  }, []);

  useEffect(() => {
    api<DueResponse>("/api/reviews/due?limit=20").then(apply, (e: Error) => setError(e.message));
  }, [apply]);

  const card = queue?.[0];

  const answer = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return;
      setBusy(true);
      setError(null);
      try {
        await api("/api/reviews", {
          method: "POST",
          json: { vocabularyId: card.vocabularyId, rating, durationMs: Date.now() - shownAt.current },
        });
        setDone((n) => n + 1);
        // A card answered Again/Hard is due again in minutes, so refetch the queue rather than guessing.
        apply(await api<DueResponse>("/api/reviews/due?limit=20"));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [card, busy, apply],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || (e.target as HTMLElement).tagName === "INPUT") return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const b = BUTTONS.find((x) => x.key === e.key);
        if (b) answer(b.rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, revealed, answer]);

  if (error && !queue) return <ErrorNote message={error} />;
  if (!queue) return <p className="text-muted">Loading…</p>;

  if (!card) {
    return (
      <Card>
        <EmptyState title={done > 0 ? "All caught up" : "Nothing due right now"} petals={done > 0}>
          <p>{done > 0 ? `You reviewed ${done} card${done === 1 ? "" : "s"}.` : "Save words while reading and they'll show up here."}</p>
          <Link href="/library" className="mt-4 inline-block text-accent underline">
            Back to reading
          </Link>
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {remaining} due · {done} done
      </p>

      <Card className="space-y-6 py-10 text-center">
        <p className="jp text-5xl leading-tight" lang="ja">
          {card.term}
        </p>

        {card.context && (
          <p className="jp mx-auto max-w-xl text-lg text-muted" lang="ja">
            <Sentence sentence={card.context.sentence} word={card.context.surfaceForm} />
          </p>
        )}

        {revealed ? (
          <div className="space-y-1 border-t border-border pt-6">
            <p className="jp text-xl">{card.reading}</p>
            <p className="text-lg">{card.meaning}</p>
            {card.partOfSpeech && <p className="text-xs text-muted">{card.partOfSpeech}</p>}
          </div>
        ) : (
          <Button onClick={() => setRevealed(true)}>
            Show answer <span className="ml-1 opacity-70">(space)</span>
          </Button>
        )}
      </Card>

      <ErrorNote message={error} />

      {revealed && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BUTTONS.map((b) => (
            <button
              key={b.rating}
              onClick={() => answer(b.rating)}
              disabled={busy}
              className={`petal border bg-surface px-3 py-3 text-center disabled:opacity-50 ${b.style}`}
            >
              <span className="block font-medium">{b.label}</span>
              <span className="block text-xs text-muted">
                {card.nextIntervals[b.rating]} · {b.key}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
