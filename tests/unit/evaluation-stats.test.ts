import { describe, it, expect } from "vitest";
import {
  computeOverallAverage,
  computePerRoundAverages,
  computeLeaderboard,
} from "@/lib/evaluation-stats";

describe("computeOverallAverage", () => {
  it("returns 0 for empty array", () => {
    expect(computeOverallAverage([])).toBe(0);
  });
  it("returns the single value", () => {
    expect(computeOverallAverage([80])).toBe(80);
  });
  it("returns correct average", () => {
    expect(computeOverallAverage([70, 80, 90])).toBeCloseTo(80);
  });
});

describe("computePerRoundAverages", () => {
  it("groups scores by roundId", () => {
    const scores = [
      { roundId: 1, roundName: "Round 1", score: 60 },
      { roundId: 1, roundName: "Round 1", score: 80 },
      { roundId: 2, roundName: "Round 2", score: 90 },
    ];
    const result = computePerRoundAverages(scores);
    expect(result[1].average).toBeCloseTo(70);
    expect(result[1].count).toBe(2);
    expect(result[2].average).toBe(90);
    expect(result[2].count).toBe(1);
  });

  it("returns empty object for no scores", () => {
    expect(computePerRoundAverages([])).toEqual({});
  });
});

describe("computeLeaderboard", () => {
  const students = [
    { id: "a", fullName: "Alice", groupName: "G1", avgScore: 90 },
    { id: "b", fullName: "Bob", groupName: "G1", avgScore: 85 },
    { id: "c", fullName: "Charlie", groupName: "G1", avgScore: 70 },
    { id: "d", fullName: "Dan", groupName: "G1", avgScore: 60 },
    { id: "e", fullName: "Eve", groupName: "G2", avgScore: 95 },
    { id: "f", fullName: "Frank", groupName: "G2", avgScore: 50 },
  ];

  it("returns top 3 per group", () => {
    const board = computeLeaderboard(students, 3);
    const g1 = board.find((b) => b.groupName === "G1")!;
    const g2 = board.find((b) => b.groupName === "G2")!;
    expect(g1.top).toHaveLength(3);
    expect(g1.top[0].fullName).toBe("Alice");
    expect(g2.top).toHaveLength(2); // only 2 in G2
    expect(g2.top[0].fullName).toBe("Eve");
  });

  it("sorts by avgScore descending", () => {
    const board = computeLeaderboard(students, 3);
    const g1 = board.find((b) => b.groupName === "G1")!;
    expect(g1.top[0].avgScore).toBeGreaterThan(g1.top[1].avgScore);
  });

  it("students with no group go to fallback group", () => {
    const s = [{ id: "x", fullName: "NoGroup", groupName: null, avgScore: 75 }];
    const board = computeLeaderboard(s);
    expect(board[0].groupName).toBe("ไม่ระบุ");
    expect(board[0].top[0].fullName).toBe("NoGroup");
  });
});
