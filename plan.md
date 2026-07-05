# 英文寫作訓練 Web App — 詳細實作計畫（可獨立執行）

> 此文件為完整交接規格。另一個 session 讀完此檔應能**無需額外上下文**直接開工。
> 使用者為軟體公司 CTO，熟悉全端；請直接執行，不需手把手解釋基礎概念。

---

## 0. 背景與目標（Context）

**使用者狀況**：多益 700、能與外國人日常對話，但未長期旅外，**英文寫作與論證結構**是主要瓶頸。

**三個互相關聯的目標**：
1. 半年後要辦英文**辯論/討論會** → 需要能即時產出結構清楚的論述（本質是「即時寫作」）。
2. 目標 **TOEIC 900**。
3. 目標 **IELTS 7**。
→ 三者核心都是「論證式寫作 + 精準用字」，一套工具可同時餵。

**真正的痛點**：不是「不會寫」，而是缺少**高品質、針對性的回饋迴路**——寫得出來但不夠 native、搭配詞（collocation）與語域（register）不精準、論述骨架鬆散。市面工具不對症（Grammarly 只修文法、通用聊天機器人太發散、不成系統）。

**產品成果**：個人用綜合寫作訓練 app。核心迴路：
```
選題/自由寫 → AI 雙軌回饋（修正 + 升級）+ 四維評分 → 一鍵收集高級表達進個人語料庫 → 間隔複習內化 → 追蹤分數進步
```
第三階段再接「寫→說」橋接，直接支援辯論會。

---

## 1. 技術選型（已定案）

| 項目 | 選擇 | 理由 |
|---|---|---|
| 框架 | **Next.js 15 (App Router) + TypeScript** | 全端一體；Route Handlers 直接當後端呼叫 OpenRouter |
| UI | **Tailwind CSS + shadcn/ui** | 快速做乾淨介面、元件可控 |
| 圖表 | **Recharts** | 進度折線圖 |
| DB / ORM | **SQLite + Prisma**（本機開發）| 個人 app 最簡單；部署想上雲改 `datasource` 換 Turso/Neon Postgres 即可 |
| AI 供應商 | **OpenRouter**（OpenAI-compatible API）| 一個 `baseURL` + `model` 字串即可切換模型 |
| AI SDK | **官方 `openai` npm 套件**，`baseURL` 指向 `https://openrouter.ai/api/v1` | OpenRouter 相容 OpenAI SDK |

**模型選型（全部放 env，不寫死）**：
- 主回饋模型 `FEEDBACK_MODEL` = `google/gemini-2.5-flash` — 語感細膩、JSON 輸出穩、便宜（一次回饋約 2–4k tokens，成本台幣幾毛）。
- 評分模型 `SCORING_MODEL` = `anthropic/claude-haiku-4.5`（評分要準時用；預算緊也可與主模型相同）。
- 更省替代：`google/gemini-2.5-flash-lite`、`deepseek/deepseek-chat`(V3)。

> 切換模型只需改 env，程式不動。務必保持這個彈性。

---

## 2. 專案初始化步驟

```bash
# 在 D:\yale\coding\element-ai\engy 內
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
npm install prisma @prisma/client openai recharts zod
npm install -D @types/node
npx prisma init --datasource-provider sqlite
npx shadcn@latest init          # 選 default 樣式
npx shadcn@latest add button card textarea input badge tabs dialog toast skeleton
```

`.env.local`：
```env
OPENROUTER_API_KEY=sk-or-xxxxx        # 使用者自帶
FEEDBACK_MODEL=google/gemini-2.5-flash
SCORING_MODEL=anthropic/claude-haiku-4.5
DATABASE_URL="file:./dev.db"
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME="Writing Trainer"
```

---

## 3. 資料模型（`prisma/schema.prisma`）

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

model Prompt {
  id         String   @id @default(cuid())
  type       String   // argumentative | business_email | business_report | debate_motion | free
  title      String
  body       String   // 題目說明 / 情境
  difficulty String   @default("medium") // easy | medium | hard
  tags       String   @default("")       // 逗號分隔
  createdAt  DateTime @default(now())
  essays     Essay[]
}

model Essay {
  id          String     @id @default(cuid())
  promptId    String?
  prompt      Prompt?    @relation(fields: [promptId], references: [id])
  content     String
  wordCount   Int
  durationSec Int?       // 限時模式用；null = 不限時
  createdAt   DateTime   @default(now())
  feedback    Feedback[]
  phraseCards PhraseCard[]
}

model Feedback {
  id                 String   @id @default(cuid())
  essayId            String
  essay              Essay    @relation(fields: [essayId], references: [id], onDelete: Cascade)
  model              String   // 實際使用的模型 id
  raw                String   // 原始 JSON 字串（除錯/稽核用）
  taskResponse       Float
  coherenceCohesion  Float
  lexicalResource    Float
  grammaticalRange   Float
  overallBand        Float
  toeicWritingEst    Int?     // TOEIC Writing 估分 0-200
  createdAt          DateTime @default(now())
}

model PhraseCard {
  id        String   @id @default(cuid())
  original  String   // 你原本寫的
  upgraded  String   // 建議的更 native 說法
  note      String   // 為什麼更好
  essayId   String?
  essay     Essay?   @relation(fields: [essayId], references: [id])
  // 間隔複習 (SM-2 簡化)
  dueAt     DateTime @default(now())
  interval  Int      @default(0)  // 天
  ease      Float    @default(2.5)
  reps      Int      @default(0)
  createdAt DateTime @default(now())
}
```

跑 `npx prisma migrate dev --name init` 建表。

`src/lib/db.ts`（避免 dev 熱重載多建 client）：
```ts
import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
```

---

## 4. AI 回饋核心

### 4.1 OpenRouter client（`src/lib/openrouter.ts`）
```ts
import OpenAI from "openai";
export const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "",
    "X-Title": process.env.OPENROUTER_APP_NAME ?? "Writing Trainer",
  },
});
```

### 4.2 回饋 JSON schema（`src/lib/prompts/feedback.ts`）

用 **structured output**（`response_format: { type: "json_schema", json_schema: {...} }`）確保前端穩定渲染。同時用 `zod` 在後端二次驗證。

回傳結構（TS 型別，也是 zod schema 依據）：
```ts
export interface FeedbackResult {
  corrections: {
    original: string;
    corrected: string;
    category: "grammar" | "collocation" | "spelling" | "register" | "punctuation";
    explanation: string;      // 用中文解釋，讓使用者秒懂
  }[];
  upgrades: {                  // 700→900 關鍵：native 化建議
    original: string;
    upgraded: string;
    reason: string;           // 中文說明為何更 native
  }[];
  structure: {
    thesisClear: boolean;
    skeleton: {               // 論證骨架覆蓋度
      claim: boolean;
      evidence: boolean;
      reasoning: boolean;
      rebuttal: boolean;
    };
    cohesion: string;         // 連貫性評語（中文）
    comments: string;         // 結構整體建議（中文）
  };
  scores: {                   // 對齊 IELTS band descriptors, 0-9 每 0.5 一階
    taskResponse: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammaticalRange: number;
    overallBand: number;
    toeicWritingEstimate: number; // 0-200
    perDimensionNotes: {
      taskResponse: string;
      coherenceCohesion: string;
      lexicalResource: string;
      grammaticalRange: string;
    };
  };
}
```

**System prompt 要點**（放同檔，版本化管理）：
- 角色：資深 IELTS + TOEIC 考官，同時是英文辯論教練。
- 附 IELTS Writing Task 2 四維 band descriptors 摘要（band 6/7/8 差異）當評分依據。
- 要求：`corrections`/`upgrades` 只列**真正值得改**的（各上限 ~8 條，避免噪音）；解釋一律**用繁體中文**（使用者母語），例句/建議用英文。
- 嚴格只輸出符合 schema 的 JSON，不要多餘文字。
- 若作文極短或離題，仍須給分並在 notes 說明。

### 4.3 呼叫函式（`src/lib/feedback.ts`）
```ts
export async function getFeedback(input: {
  content: string;
  promptTitle?: string;
  promptBody?: string;
  type?: string;
}): Promise<{ result: FeedbackResult; model: string; raw: string }> {
  const model = process.env.FEEDBACK_MODEL!;
  const completion = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
    response_format: { type: "json_schema", json_schema: FEEDBACK_JSON_SCHEMA },
    temperature: 0.3,
  });
  const raw = completion.choices[0].message.content ?? "{}";
  const result = FeedbackZodSchema.parse(JSON.parse(raw)); // zod 驗證
  return { result, model, raw };
}
```
> 注意：部分模型對 `json_schema` 支援度不同。若某模型不支援，退回 `response_format:{type:"json_object"}` 並在 prompt 內貼出 schema。實作時對 Gemini 2.5 Flash 先測 `json_schema`。

---

## 5. API（Route Handlers）

### `POST /api/feedback`
Body: `{ content, promptId? }`
流程：
1. 用 zod 驗證 body。
2. 若有 `promptId` 撈 Prompt 帶入 context。
3. 計算 `wordCount`。
4. 建 `Essay`。
5. 呼叫 `getFeedback`。
6. 建 `Feedback`（存四維分數 + overallBand + toeicWritingEst + raw）。
7. 回傳 `{ essayId, feedback: FeedbackResult }`。
錯誤處理：AI 失敗或 zod 解析失敗 → 回 500 並帶訊息，前端顯示可重試。

### `POST /api/phrasecards`
Body: `{ original, upgraded, note, essayId? }` → 建 `PhraseCard`（`dueAt = now`）。

### `POST /api/phrasecards/[id]/review`
Body: `{ grade: 0|1|2|3 }`（0=忘, 3=秒答）→ 呼叫 `src/lib/srs.ts` 更新 `interval/ease/reps/dueAt`，回傳更新後卡片。

### `GET /api/progress`
回傳所有 Feedback 的四維分數 + overallBand 時間序列，給折線圖。

---

## 6. 間隔複習演算法（`src/lib/srs.ts`）

簡化 SM-2：
```ts
export function nextReview(card: {interval:number; ease:number; reps:number}, grade:number){
  let { interval, ease, reps } = card;
  if (grade < 2) { reps = 0; interval = 1; }           // 忘了 → 明天再來
  else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * ease);
    ease = Math.max(1.3, ease + (0.1 - (3 - grade) * 0.08));
  }
  const dueAt = new Date(Date.now() + interval * 86400000);
  return { interval, ease, reps, dueAt };
}
```

---

## 7. 頁面 / UI

**MVP（先做，可獨立驗證整條閉環）**
- `/`（首頁）：導覽卡片連到各功能 + 今日待複習卡數。
- `/write`：
  - 上方：題庫下拉（依 `type` 分組）或「自由題」。
  - 中間：`textarea` 編輯器，即時字數；可選「限時模式」倒數（存 `durationSec`）。
  - 送出 → 呼叫 `/api/feedback` → 導到 `/essays/[id]`。
- `/essays/[id]`：
  - 四維分數卡（含 overallBand 大字 + TOEIC 估分）。
  - `structure` 區塊：thesis/claim/evidence/reasoning/rebuttal 用勾/叉 badge 呈現 + 評語。
  - `corrections`：inline diff（原句刪除線紅 + 修正綠）+ 中文解釋。
  - `upgrades`：每條「你寫 X → 建議 Y（原因）」+ 一鍵「加入語料庫」按鈕 → `POST /api/phrasecards`。

**第二階段**
- `/phrasebank`：卡片列表 + 篩選 due。複習模式：先只顯示 `original`，使用者心中回想 → 翻開看 `upgraded/note` → 自評 grade（0–3）→ 更新 SRS。
- `/progress`：Recharts 折線圖，四維 + overall 隨時間；顯示最高分、平均、趨勢。

**第三階段（辯論橋接）**
- 辯題模式：先分段寫 claim/evidence/reasoning/rebuttal → 限時**口說**（Web Speech API `SpeechRecognition` 轉文字，或上傳錄音）→ 把口說 transcript 與書寫版丟給 AI，回饋「口說時掉了哪些論點/降級了哪些用字」。

---

## 8. 種子題庫（`prisma/seed.ts`）

放各類型各 3–5 題，`npx prisma db seed` 灌入。範例：
- argumentative（IELTS Task 2 風格）：「Some people think university education should be free. To what extent do you agree?」
- business_email：「向海外供應商延後出貨並要求折扣的 email」
- business_report：「一頁季度銷售摘要」
- debate_motion：「This house believes remote work harms early-career growth.」

`package.json` 加：
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```
（`npm i -D tsx`）

---

## 9. 檔案樹（預計）

```
src/
  app/
    page.tsx                      # 首頁
    write/page.tsx
    essays/[id]/page.tsx
    phrasebank/page.tsx
    progress/page.tsx
    api/
      feedback/route.ts
      phrasecards/route.ts
      phrasecards/[id]/review/route.ts
      progress/route.ts
  lib/
    db.ts
    openrouter.ts
    feedback.ts
    srs.ts
    prompts/feedback.ts           # SYSTEM_PROMPT + JSON schema + zod
  components/                     # shadcn 元件 + 自訂 (ScoreCard, DiffView, UpgradeItem...)
prisma/
  schema.prisma
  seed.ts
.env.local
```

---

## 10. 驗證方式（end-to-end）

1. `npm run dev` → 開 `/write`，寫一段 argumentative 短文送出。
2. 確認 `/api/feedback` 回**合法 JSON**、`/essays/[id]` 正確渲染四維分數 + corrections diff + upgrades。
3. 檢查 DB：`npx prisma studio` 看 `Feedback.raw` 有存原始回應、分數欄位有值。
4. 點某 upgrade 的「加入語料庫」→ `/phrasebank` 出現卡片。
5. 複習該卡一次 → 確認 `dueAt/interval/reps` 有更新。
6. `/progress` 至少寫 2 篇後看到折線圖。
7. 改 `.env.local` 的 `FEEDBACK_MODEL`（flash → flash-lite / deepseek-chat）重啟，確認**無痛切換**且輸出仍符合 schema。
8. 上 OpenRouter Dashboard 用量頁確認單次成本符合預期（應為極小額）。

---

## 11. 建議實作順序（給另一個 session 的 checklist）

- [ ] 1. 專案骨架（§2）+ Prisma schema + migrate（§3）
- [ ] 2. `openrouter.ts` + `prompts/feedback.ts` + `feedback.ts`，用固定文字打通 JSON 回饋（先寫個 script 驗證）
- [ ] 3. `/api/feedback` + `/write` + `/essays/[id]`（MVP 閉環）
- [ ] 4. 種子題庫（§8）
- [ ] 5. 語料庫 + SRS（`/phrasebank`、`srs.ts`、相關 API）
- [ ] 6. `/progress` 圖表
- [ ] 7.（之後）辯論「寫→說」橋接

---

## 12. 注意事項 / 已知風險

- **structured output 相容性**：不同模型對 `json_schema` 支援不一，Gemini 2.5 Flash 要先實測；不支援就退回 `json_object` + prompt 內貼 schema，並保留 zod 驗證當防線。
- **回饋數量控制**：corrections/upgrades 各限 ~8 條，避免資訊過載，維持可執行性。
- **解釋語言**：所有「解釋/原因/評語」用**繁體中文**；例句與建議用英文。
- **成本**：單次回饋約台幣幾毛，個人使用可忽略；仍把模型做成可設定以便日後比較。
- **部署**：若要上線，SQLite 換 Turso（libSQL）或 Neon Postgres，只改 `datasource` 與 `DATABASE_URL`；Route Handlers 與 OpenRouter 呼叫不變。
- **單人使用**：MVP 不做登入；若日後多人再加 auth（NextAuth）與 `userId` 外鍵。
```
