import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    courseSection: {
      findUnique: vi.fn(),
    },
    lessonProgress: {
      findUnique: vi.fn(),
    },
    quizAttempt: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { isSectionComplete, isQuizPassed } from "@/lib/course-gates";

const mockPrisma = prisma as unknown as {
  courseSection: { findUnique: ReturnType<typeof vi.fn> };
  lessonProgress: { findUnique: ReturnType<typeof vi.fn> };
  quizAttempt: { findFirst: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isQuizPassed", () => {
  it("returns true when a passing attempt exists", async () => {
    mockPrisma.quizAttempt.findFirst.mockResolvedValue({ id: 1, isPassed: true });
    expect(await isQuizPassed("user1", 10)).toBe(true);
  });

  it("returns false when no passing attempt", async () => {
    mockPrisma.quizAttempt.findFirst.mockResolvedValue(null);
    expect(await isQuizPassed("user1", 10)).toBe(false);
  });
});

describe("isSectionComplete", () => {
  it("returns false when section not found", async () => {
    mockPrisma.courseSection.findUnique.mockResolvedValue(null);
    expect(await isSectionComplete("user1", 99)).toBe(false);
  });

  it("returns false when a lesson is not completed", async () => {
    mockPrisma.courseSection.findUnique.mockResolvedValue({
      id: 1,
      lessons: [{ id: 10 }, { id: 11 }],
      sectionQuizzes: [],
    });
    mockPrisma.lessonProgress.findUnique
      .mockResolvedValueOnce({ isCompleted: true })   // lesson 10 done
      .mockResolvedValueOnce({ isCompleted: false });  // lesson 11 not done
    expect(await isSectionComplete("user1", 1)).toBe(false);
  });

  it("returns false when gate quiz not passed", async () => {
    mockPrisma.courseSection.findUnique.mockResolvedValue({
      id: 1,
      lessons: [{ id: 10 }, { id: 11 }],
      sectionQuizzes: [{ quizId: 5 }],
    });
    mockPrisma.lessonProgress.findUnique.mockResolvedValue({ isCompleted: true });
    mockPrisma.quizAttempt.findFirst.mockResolvedValue(null); // not passed
    expect(await isSectionComplete("user1", 1)).toBe(false);
  });

  it("returns true when all lessons done and gate quiz passed", async () => {
    mockPrisma.courseSection.findUnique.mockResolvedValue({
      id: 1,
      lessons: [{ id: 10 }, { id: 11 }],
      sectionQuizzes: [{ quizId: 5 }],
    });
    mockPrisma.lessonProgress.findUnique.mockResolvedValue({ isCompleted: true });
    mockPrisma.quizAttempt.findFirst.mockResolvedValue({ id: 1, isPassed: true });
    expect(await isSectionComplete("user1", 1)).toBe(true);
  });

  it("returns true when all lessons done and no gate quiz required", async () => {
    mockPrisma.courseSection.findUnique.mockResolvedValue({
      id: 1,
      lessons: [{ id: 10 }],
      sectionQuizzes: [], // no gate
    });
    mockPrisma.lessonProgress.findUnique.mockResolvedValue({ isCompleted: true });
    expect(await isSectionComplete("user1", 1)).toBe(true);
  });

  it("returns true for empty section with no gate quiz", async () => {
    mockPrisma.courseSection.findUnique.mockResolvedValue({
      id: 1,
      lessons: [],
      sectionQuizzes: [],
    });
    expect(await isSectionComplete("user1", 1)).toBe(true);
  });
});
