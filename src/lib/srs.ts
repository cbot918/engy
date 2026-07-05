// 簡化 SM-2 間隔複習演算法
// grade: 0 = 忘了, 1 = 很吃力, 2 = 想起來, 3 = 秒答

export interface SrsState {
  interval: number; // 天
  ease: number;
  reps: number;
}

export function nextReview(
  card: SrsState,
  grade: number
): SrsState & { dueAt: Date } {
  let { interval, ease, reps } = card;

  if (grade < 2) {
    reps = 0;
    interval = 1; // 忘了 → 明天再來
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * ease);
    ease = Math.max(1.3, ease + (0.1 - (3 - grade) * 0.08));
  }

  const dueAt = new Date(Date.now() + interval * 86_400_000);
  return { interval, ease, reps, dueAt };
}
