import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: "intro-to-teaching" },
    select: {
      id: true,
      title: true,
      preTestQuizId: true,
      postTestQuizId: true,
      _count: { select: { lessons: true, enrollments: true } },
    },
  });
  console.log("Course:", JSON.stringify(course, null, 2));

  const lessons = await prisma.lesson.findMany({
    where: { course: { slug: "intro-to-teaching" } },
    select: { id: true, title: true, order: true, sectionId: true },
    orderBy: { order: "asc" },
  });
  console.log("Lessons:", JSON.stringify(lessons, null, 2));

  const sections = await prisma.courseSection.findMany({
    where: { course: { slug: "intro-to-teaching" } },
    select: { id: true, title: true, order: true },
    orderBy: { order: "asc" },
  });
  console.log("Sections:", JSON.stringify(sections, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
