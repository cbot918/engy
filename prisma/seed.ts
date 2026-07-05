import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const prompts: {
  type: string;
  title: string;
  body: string;
  difficulty: string;
  tags: string;
}[] = [
  // --- argumentative (IELTS Task 2 風格) ---
  {
    type: "argumentative",
    title: "Free university education",
    body: "Some people think university education should be free for all students. To what extent do you agree or disagree? Give reasons and examples. Write at least 250 words.",
    difficulty: "medium",
    tags: "education,ielts",
  },
  {
    type: "argumentative",
    title: "Remote work and productivity",
    body: "Working from home has become common. Do the advantages of remote work outweigh the disadvantages? Support your view with reasons and examples. Write at least 250 words.",
    difficulty: "medium",
    tags: "work,ielts",
  },
  {
    type: "argumentative",
    title: "Social media regulation",
    body: "Some argue governments should strictly regulate social media platforms, while others believe this threatens free speech. Discuss both views and give your own opinion. Write at least 250 words.",
    difficulty: "hard",
    tags: "technology,society,ielts",
  },

  // --- business_email ---
  {
    type: "business_email",
    title: "Delay shipment & request discount",
    body: "Write an email to an overseas supplier informing them that you need to delay a shipment by two weeks, and politely request a 5% discount to compensate for the inconvenience on your side. Keep a professional, courteous tone.",
    difficulty: "medium",
    tags: "business,toeic",
  },
  {
    type: "business_email",
    title: "Decline a meeting, propose alternative",
    body: "A client proposed a meeting time that conflicts with another commitment. Write an email to decline politely, explain briefly, and propose two alternative slots.",
    difficulty: "easy",
    tags: "business,toeic",
  },

  // --- business_report ---
  {
    type: "business_report",
    title: "Quarterly sales summary",
    body: "Write a one-paragraph quarterly sales summary for management. Sales grew 12% QoQ, driven by the APAC region; the EU region declined 4%. Recommend one action. Be concise and formal.",
    difficulty: "medium",
    tags: "business,report,toeic",
  },

  // --- debate_motion ---
  {
    type: "debate_motion",
    title: "Remote work harms early-career growth",
    body: "Motion: This house believes that remote work harms early-career professional growth. Write your opening argument as the PROPOSITION: state a clear claim, give evidence, reason from it, and pre-empt one likely rebuttal.",
    difficulty: "hard",
    tags: "debate,work",
  },
  {
    type: "debate_motion",
    title: "Ban private cars in city centres",
    body: "Motion: This house would ban private cars from city centres. Write your opening argument for EITHER side: claim, evidence, reasoning, and handle one counter-argument.",
    difficulty: "hard",
    tags: "debate,environment",
  },
];

async function main() {
  const count = await prisma.prompt.count();
  if (count > 0) {
    console.log(`已有 ${count} 個題目，跳過 seed。`);
    return;
  }
  await prisma.prompt.createMany({ data: prompts });
  console.log(`已灌入 ${prompts.length} 個題目。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
