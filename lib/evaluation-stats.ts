export type RoundScore = { roundId: number; roundName: string; score: number; maxScore: number };

export function computeOverallAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function computePerRoundAverages(
  scores: { roundId: number; roundName: string; score: number }[]
): Record<number, { roundName: string; average: number; count: number }> {
  const map: Record<number, { roundName: string; scores: number[] }> = {};
  for (const s of scores) {
    if (!map[s.roundId]) map[s.roundId] = { roundName: s.roundName, scores: [] };
    map[s.roundId].scores.push(s.score);
  }
  return Object.fromEntries(
    Object.entries(map).map(([id, { roundName, scores }]) => [
      id,
      {
        roundName,
        average: computeOverallAverage(scores),
        count: scores.length,
      },
    ])
  );
}

export function computeLeaderboard(
  students: { id: string; fullName: string; groupName: string | null; avgScore: number }[],
  topN = 3
): { groupName: string; top: typeof students }[] {
  const groups = new Map<string, typeof students>();
  for (const s of students) {
    const g = s.groupName ?? "ไม่ระบุ";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }

  return Array.from(groups.entries()).map(([groupName, members]) => ({
    groupName,
    top: members
      .sort((a, b) => b.avgScore - a.avgScore || a.fullName.localeCompare(b.fullName))
      .slice(0, topN),
  }));
}
