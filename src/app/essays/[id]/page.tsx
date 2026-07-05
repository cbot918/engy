import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FeedbackZodSchema, type FeedbackResult } from "@/lib/prompts/feedback";
import UpgradeList from "@/components/UpgradeList";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  grammar: "文法",
  collocation: "搭配詞",
  spelling: "拼字",
  register: "語域",
  punctuation: "標點",
};

export default async function EssayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const essay = await prisma.essay.findUnique({
    where: { id },
    include: {
      prompt: true,
      feedback: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!essay) notFound();

  const fb = essay.feedback[0];
  let result: FeedbackResult | null = null;
  if (fb) {
    try {
      result = FeedbackZodSchema.parse(JSON.parse(fb.raw));
    } catch {
      result = null;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">批改結果</h1>
        <Link href="/write" className="text-sm font-medium text-blue-600 hover:underline">
          ← 再寫一篇
        </Link>
      </div>

      {essay.prompt && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="font-semibold text-slate-900">{essay.prompt.title}</div>
          <p className="mt-1 whitespace-pre-wrap text-slate-600">{essay.prompt.body}</p>
        </div>
      )}

      {!result ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          尚無有效的 AI 回饋（可能是 API key 未設定或呼叫失敗）。請回寫作頁重試。
        </div>
      ) : (
        <>
          {/* 四維分數 */}
          <section>
            <h2 className="mb-3 font-semibold text-slate-900">四維評分</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-4xl font-bold text-blue-600">
                    {result.scores.overallBand.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500">IELTS Overall Band</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-slate-800">
                    {result.scores.toeicWritingEstimate}
                    <span className="text-sm text-slate-400"> /200</span>
                  </div>
                  <div className="text-xs text-slate-500">TOEIC Writing 估分</div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ScoreBar label="Task Response" value={result.scores.taskResponse} note={result.scores.perDimensionNotes.taskResponse} />
                <ScoreBar label="Coherence & Cohesion" value={result.scores.coherenceCohesion} note={result.scores.perDimensionNotes.coherenceCohesion} />
                <ScoreBar label="Lexical Resource" value={result.scores.lexicalResource} note={result.scores.perDimensionNotes.lexicalResource} />
                <ScoreBar label="Grammatical Range" value={result.scores.grammaticalRange} note={result.scores.perDimensionNotes.grammaticalRange} />
              </div>
            </div>
          </section>

          {/* 結構 */}
          <section>
            <h2 className="mb-3 font-semibold text-slate-900">論證結構</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
              <div className="flex flex-wrap gap-2">
                <Chip ok={result.structure.thesisClear} label="論點明確" />
                <Chip ok={result.structure.skeleton.claim} label="Claim" />
                <Chip ok={result.structure.skeleton.evidence} label="Evidence" />
                <Chip ok={result.structure.skeleton.reasoning} label="Reasoning" />
                <Chip ok={result.structure.skeleton.rebuttal} label="Rebuttal" />
              </div>
              <p className="mt-3 text-slate-700">
                <span className="font-medium">連貫性：</span>
                {result.structure.cohesion}
              </p>
              <p className="mt-2 text-slate-700">
                <span className="font-medium">整體建議：</span>
                {result.structure.comments}
              </p>
            </div>
          </section>

          {/* 修正 */}
          <section>
            <h2 className="mb-3 font-semibold text-slate-900">
              修正 ({result.corrections.length})
            </h2>
            {result.corrections.length === 0 ? (
              <p className="text-sm text-slate-500">沒有明顯錯誤，很棒！</p>
            ) : (
              <ul className="space-y-3">
                {result.corrections.map((c, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                    <span className="mb-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {CATEGORY_LABELS[c.category] ?? c.category}
                    </span>
                    <div className="text-sm">
                      <span className="text-red-600 line-through">{c.original}</span>
                      {"  "}
                      <span className="font-medium text-emerald-700">{c.corrected}</span>
                    </div>
                    <div className="mt-1.5 text-sm text-slate-600">{c.explanation}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 升級建議 */}
          <section>
            <h2 className="mb-3 font-semibold text-slate-900">
              Native 升級建議 ({result.upgrades.length})
            </h2>
            <UpgradeList upgrades={result.upgrades} essayId={essay.id} />
          </section>
        </>
      )}

      {/* 原文 */}
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">你的原文（{essay.wordCount} 字）</h2>
        <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm text-slate-700">
          {essay.content}
        </div>
      </section>
    </div>
  );
}

function ScoreBar({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-blue-500"
          style={{ width: `${(value / 9) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
      }`}
    >
      {ok ? "✓" : "✕"} {label}
    </span>
  );
}
