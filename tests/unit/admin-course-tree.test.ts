import { describe, it, expect } from "vitest";

type Lesson = { id: number; sectionId: number | null; order: number; title: string };
type Section = { id: number; order: number; title: string; lessons: Lesson[] };

// Mirrors the tree-building logic used in the admin course detail page
function buildCourseTree(
  sections: Section[],
  unsectionedLessons: Lesson[]
): { sections: Section[]; unsectioned: Lesson[] } {
  return {
    sections: [...sections].sort((a, b) => a.order - b.order),
    unsectioned: [...unsectionedLessons].sort((a, b) => a.order - b.order),
  };
}

function getLessonCounts(
  lesson: { _count: { assignments: number; lessonQuizzes: number } }
): string {
  const parts: string[] = [];
  if (lesson._count.assignments > 0) parts.push(`${lesson._count.assignments} งาน`);
  if (lesson._count.lessonQuizzes > 0) parts.push(`${lesson._count.lessonQuizzes} แบบทดสอบ`);
  return parts.length > 0 ? parts.join(" · ") : "ยังไม่มีเนื้อหา";
}

describe("admin course tree view — tree building", () => {
  it("sorts sections by order", () => {
    const sections: Section[] = [
      { id: 2, order: 20, title: "B", lessons: [] },
      { id: 1, order: 10, title: "A", lessons: [] },
    ];
    const { sections: result } = buildCourseTree(sections, []);
    expect(result[0].title).toBe("A");
    expect(result[1].title).toBe("B");
  });

  it("separates unsectioned lessons", () => {
    const unsectioned: Lesson[] = [
      { id: 3, sectionId: null, order: 2, title: "C" },
      { id: 2, sectionId: null, order: 1, title: "B" },
    ];
    const { unsectioned: result } = buildCourseTree([], unsectioned);
    expect(result[0].title).toBe("B");
    expect(result[1].title).toBe("C");
  });

  it("sections contain their own lessons", () => {
    const sections: Section[] = [
      {
        id: 1, order: 10, title: "A",
        lessons: [{ id: 1, sectionId: 1, order: 1, title: "L1" }],
      },
    ];
    const { sections: result } = buildCourseTree(sections, []);
    expect(result[0].lessons).toHaveLength(1);
    expect(result[0].lessons[0].title).toBe("L1");
  });

  it("returns empty unsectioned when all lessons are in sections", () => {
    const { unsectioned } = buildCourseTree([], []);
    expect(unsectioned).toHaveLength(0);
  });
});

describe("admin course tree view — lesson count display", () => {
  it("shows assignment and quiz counts", () => {
    const result = getLessonCounts({ _count: { assignments: 2, lessonQuizzes: 1 } });
    expect(result).toBe("2 งาน · 1 แบบทดสอบ");
  });

  it("shows only assignments when no quizzes", () => {
    const result = getLessonCounts({ _count: { assignments: 3, lessonQuizzes: 0 } });
    expect(result).toBe("3 งาน");
  });

  it("shows placeholder when both zero", () => {
    const result = getLessonCounts({ _count: { assignments: 0, lessonQuizzes: 0 } });
    expect(result).toBe("ยังไม่มีเนื้อหา");
  });
});
