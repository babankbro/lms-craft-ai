import { describe, it, expect } from "vitest";

// Mirrors linkQuizTarget logic: detach-all-then-attach-one
type LessonLink = { lessonId: number; quizId: number };
type SectionLink = { sectionId: number; quizId: number };

function applyLinkTarget(
  quizId: number,
  currentLessonLinks: LessonLink[],
  currentSectionLinks: SectionLink[],
  targetType: "lesson" | "section" | "none",
  targetId: number,
): { lessonLinks: LessonLink[]; sectionLinks: SectionLink[] } {
  // Always detach all existing links
  const lessonLinks: LessonLink[] = [];
  const sectionLinks: SectionLink[] = [];

  // Then attach the new target
  if (targetType === "lesson") {
    lessonLinks.push({ lessonId: targetId, quizId });
  } else if (targetType === "section") {
    sectionLinks.push({ sectionId: targetId, quizId });
  }

  return { lessonLinks, sectionLinks };
}

describe("linkQuizTarget — detach-all-then-attach logic", () => {
  const quizId = 5;

  it("links to a lesson and clears section links", () => {
    const result = applyLinkTarget(
      quizId,
      [],
      [{ sectionId: 2, quizId }],
      "lesson",
      10,
    );
    expect(result.lessonLinks).toEqual([{ lessonId: 10, quizId }]);
    expect(result.sectionLinks).toHaveLength(0);
  });

  it("links to a section and clears lesson links", () => {
    const result = applyLinkTarget(
      quizId,
      [{ lessonId: 3, quizId }],
      [],
      "section",
      7,
    );
    expect(result.lessonLinks).toHaveLength(0);
    expect(result.sectionLinks).toEqual([{ sectionId: 7, quizId }]);
  });

  it("clears all links when targetType is none", () => {
    const result = applyLinkTarget(
      quizId,
      [{ lessonId: 3, quizId }],
      [{ sectionId: 2, quizId }],
      "none",
      0,
    );
    expect(result.lessonLinks).toHaveLength(0);
    expect(result.sectionLinks).toHaveLength(0);
  });

  it("replaces existing lesson link with a new lesson link", () => {
    const result = applyLinkTarget(
      quizId,
      [{ lessonId: 1, quizId }],
      [],
      "lesson",
      2,
    );
    expect(result.lessonLinks).toEqual([{ lessonId: 2, quizId }]);
  });

  it("produces no links when targeting none with no existing links", () => {
    const result = applyLinkTarget(quizId, [], [], "none", 0);
    expect(result.lessonLinks).toHaveLength(0);
    expect(result.sectionLinks).toHaveLength(0);
  });
});
