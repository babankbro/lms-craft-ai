import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const assignments = await (prisma.assignment as any).findMany({
    include: {
      lesson: { select: { id: true, title: true, courseId: true } },
      questions: { select: { id: true, prompt: true, responseType: true, maxFiles: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { id: "asc" },
  });
  for (const a of assignments) {
    console.log(`Assignment id=${a.id} "${a.title}" → lesson id=${a.lesson.id} "${a.lesson.title}" (courseId=${a.lesson.courseId})`);
    console.log(`  Questions: ${a.questions.length}, Submissions: ${a._count.submissions}`);
    for (const q of a.questions) {
      console.log(`    Q${q.id}: [${q.responseType}] ${q.prompt.slice(0, 60)} maxFiles=${q.maxFiles}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
