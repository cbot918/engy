"use client";

import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

interface Row {
  createdAt: string;
  taskResponse: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalRange: number;
  overallBand: number;
}

const SERIES = [
  { key: "overallBand", name: "Overall", color: "#2563eb" },
  { key: "taskResponse", name: "Task Response", color: "#16a34a" },
  { key: "coherenceCohesion", name: "Coherence", color: "#ea580c" },
  { key: "lexicalResource", name: "Lexical", color: "#9333ea" },
  { key: "grammaticalRange", name: "Grammar", color: "#0891b2" },
];

export default function ProgressPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d) => setRows(d.feedback ?? []))
      .finally(() => setLoading(false));
  }, []);

  const data = rows.map((r, i) => ({
    ...r,
    label: `#${i + 1}`,
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">進度</h1>

      {loading ? (
        <p className="text-slate-500">載入中…</p>
      ) : data.length < 2 ? (
        <p className="text-slate-500">
          至少完成 2 篇作文後，這裡會顯示分數趨勢圖。
        </p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={s.key === "overallBand" ? 3 : 1.5}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
