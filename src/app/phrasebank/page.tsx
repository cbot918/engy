"use client";

import { useEffect, useMemo, useState } from "react";

interface Card {
  id: string;
  original: string;
  upgraded: string;
  note: string;
  dueAt: string;
  interval: number;
  reps: number;
}

const GRADES = [
  { g: 0, label: "忘了", color: "bg-red-100 text-red-700 hover:bg-red-200" },
  { g: 1, label: "吃力", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { g: 2, label: "想起來", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { g: 3, label: "秒答", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
];

export default function PhrasebankPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "review">("list");
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  async function load() {
    setLoading(true);
    const d = await fetch("/api/phrasecards").then((r) => r.json());
    setCards(d.cards ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const dueCards = useMemo(
    () => cards.filter((c) => new Date(c.dueAt) <= new Date()),
    [cards]
  );

  async function grade(g: number) {
    const card = dueCards[idx];
    if (!card) return;
    await fetch(`/api/phrasecards/${card.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: g }),
    });
    setRevealed(false);
    if (idx + 1 >= dueCards.length) {
      setMode("list");
      setIdx(0);
      load();
    } else {
      setIdx(idx + 1);
    }
  }

  if (loading) return <p className="text-slate-500">載入中…</p>;

  if (mode === "review" && dueCards.length > 0) {
    const card = dueCards[idx];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">複習</h1>
          <span className="text-sm text-slate-500">
            {idx + 1} / {dueCards.length}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            你原本寫的
          </div>
          <div className="mt-2 text-lg text-slate-700">{card.original}</div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="mt-6 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white"
            >
              想好了，看更好的說法
            </button>
          ) : (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                更 native 的說法
              </div>
              <div className="mt-2 text-lg font-semibold text-emerald-700">
                {card.upgraded}
              </div>
              <p className="mt-2 text-sm text-slate-600">{card.note}</p>
              <div className="mt-6 flex justify-center gap-2">
                {GRADES.map((x) => (
                  <button
                    key={x.g}
                    onClick={() => grade(x.g)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${x.color}`}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">語料庫</h1>
        {dueCards.length > 0 && (
          <button
            onClick={() => {
              setMode("review");
              setIdx(0);
              setRevealed(false);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            開始複習（{dueCards.length}）
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="text-slate-500">
          還沒有卡片。去批改一篇作文，把「Native 升級建議」加入語料庫吧。
        </p>
      ) : (
        <ul className="space-y-3">
          {cards.map((c) => {
            const due = new Date(c.dueAt) <= new Date();
            return (
              <li
                key={c.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500 line-through">
                      {c.original}
                    </div>
                    <div className="mt-1 font-medium text-emerald-700">
                      {c.upgraded}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{c.note}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      due
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {due ? "待複習" : `複習 ×${c.reps}`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
