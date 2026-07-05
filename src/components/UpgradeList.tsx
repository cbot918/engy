"use client";

import { useState } from "react";
import type { FeedbackResult } from "@/lib/prompts/feedback";

type Upgrade = FeedbackResult["upgrades"][number];

export default function UpgradeList({
  upgrades,
  essayId,
}: {
  upgrades: Upgrade[];
  essayId: string;
}) {
  if (upgrades.length === 0) {
    return <p className="text-sm text-slate-500">沒有升級建議 — 用字已相當自然！</p>;
  }
  return (
    <ul className="space-y-3">
      {upgrades.map((u, i) => (
        <UpgradeItem key={i} upgrade={u} essayId={essayId} />
      ))}
    </ul>
  );
}

function UpgradeItem({
  upgrade,
  essayId,
}: {
  upgrade: Upgrade;
  essayId: string;
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function add() {
    setSaving(true);
    try {
      const res = await fetch("/api/phrasecards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original: upgrade.original,
          upgraded: upgrade.upgraded,
          note: upgrade.reason,
          essayId,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500 line-through">{upgrade.original}</div>
      <div className="mt-1 font-medium text-emerald-700">{upgrade.upgraded}</div>
      <div className="mt-2 text-sm text-slate-600">{upgrade.reason}</div>
      <button
        onClick={add}
        disabled={saved || saving}
        className="mt-3 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        {saved ? "✓ 已加入語料庫" : saving ? "加入中…" : "+ 加入語料庫"}
      </button>
    </li>
  );
}
