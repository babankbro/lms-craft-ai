import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: "intro-to-teaching" }, select: { id: true } });
  if (!course) { console.log("Course not found"); return; }
  await prisma.course.delete({ where: { id: course.id } });
  console.log(`Deleted course id=${course.id} — ready for fresh seed`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
