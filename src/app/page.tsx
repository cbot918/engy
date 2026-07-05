import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [essayCount, dueCards, lastFeedback] = await Promise.all([
    prisma.essay.count(),
    prisma.phraseCard.count({ where: { dueAt: { lte: new Date() } } }),
    prisma.feedback.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  const cards = [
    {
      href: "/write",
      title: "開始寫作",
      desc: "選題或自由寫，送出後拿到雙軌回饋與四維評分。",
      cta: "去寫一篇 →",
    },
    {
      href: "/phrasebank",
      title: "語料庫複習",
      desc: `間隔複習你收集的高級表達。${dueCards > 0 ? `今天有 ${dueCards} 張待複習。` : "目前沒有待複習卡片。"}`,
      cta: "去複習 →",
    },
    {
      href: "/progress",
      title: "進度追蹤",
      desc: "看四維分數隨時間的變化，掌握成長曲線。",
      cta: "看進度 →",
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">英文寫作訓練</h1>
        <p className="mt-2 text-slate-600">
          寫作 → AI 雙軌回饋（修正 + native 升級）+ 四維評分 → 收集進語料庫 →
          間隔複習內化。衝 TOEIC 900 / IELTS 7、練辯論論述。
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="累積作文" value={essayCount} />
        <Stat label="今日待複習" value={dueCards} />
        <Stat
          label="最近 overall"
          value={lastFeedback ? lastFeedback.overallBand.toFixed(1) : "—"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900">{c.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{c.desc}</p>
            <span className="mt-3 inline-block text-sm font-medium text-blue-600 group-hover:underline">
              {c.cta}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
