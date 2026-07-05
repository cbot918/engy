"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Prompt {
  id: string;
  type: string;
  title: string;
  body: string;
  difficulty: string;
}

const TYPE_LABELS: Record<string, string> = {
  argumentative: "論證式 (IELTS Task 2)",
  business_email: "商用 Email",
  business_report: "商用報告",
  debate_motion: "辯論題",
  free: "自由題",
};

export default function WritePage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string>(""); // "" = 自由題
  const [content, setContent] = useState("");
  const [timed, setTimed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((d) => setPrompts(d.prompts ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!timed) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [timed]);

  const selected = prompts.find((p) => p.id === selectedId);
  const wordCount = useMemo(() => {
    const m = content.trim().match(/\b[\w'-]+\b/g);
    return m ? m.length : 0;
  }, [content]);

  const grouped = useMemo(() => {
    const g: Record<string, Prompt[]> = {};
    for (const p of prompts) (g[p.type] ??= []).push(p);
    return g;
  }, [prompts]);

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          promptId: selectedId || undefined,
          durationSec: timed ? elapsed : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error + (data.detail ? `（${data.detail}）` : ""));
        setSubmitting(false);
        return;
      }
      router.push(`/essays/${data.essayId}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">寫作</h1>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">選擇題目</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">— 自由題（不指定題目）—</option>
          {Object.entries(grouped).map(([type, list]) => (
            <optgroup key={type} label={TYPE_LABELS[type] ?? type}>
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selected && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
          <div className="mb-1 font-semibold text-slate-900">
            {selected.title}
          </div>
          <p className="whitespace-pre-wrap">{selected.body}</p>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="在這裡用英文寫下你的論述…"
        rows={16}
        className="w-full rounded-lg border border-slate-300 bg-white p-4 font-mono text-sm leading-relaxed focus:border-blue-400 focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <span>字數：{wordCount}</span>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={timed}
            onChange={(e) => {
              setTimed(e.target.checked);
              setElapsed(0);
            }}
          />
          限時模式
        </label>
        {timed && (
          <span className="font-mono tabular-nums">
            ⏱ {mm}:{ss}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting || !content.trim()}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "AI 批改中…（約 10–20 秒）" : "送出取得回饋"}
      </button>
    </div>
  );
}
