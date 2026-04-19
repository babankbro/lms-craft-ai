import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AssignmentPanel } from "../../lessons/[lessonId]/_components/assignment-panel";

export const dynamic = "force-dynamic";

export default async function CourseAssignmentPage({
  params,
}: {
  params: Promise<{ slug: string; assignmentId: string }>;
}) {
  const user = await requireAuth();
  const { slug, assignmentId } = await params;
  const aId = parseInt(assignmentId);
  if (isNaN(aId)) notFound();

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true, isPublished: true },
  });
  if (!course) notFound();

  const isStaff = user.role === "ADMIN" || user.role === "INSTRUCTOR" || user.role === "MENTOR";

  if (!course.isPublished && !isStaff) notFound();

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, courseId: course.id },
    select: { status: true },
  });
  const isApproved = enrollment?.status === "APPROVED";

  if (!isApproved && !isStaff) {
    redirect(`/courses/${slug}`);
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: aId },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!assignment || assignment.courseId !== course.id || assignment.lessonId !== null) {
    notFound();
  }

  const submission = await prisma.submission.findFirst({
    where: { assignmentId: aId, studentId: user.id },
    include: {
      files: true,
      answers: { include: { files: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href="/courses" className="hover:text-foreground">คอร์สเรียน</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/courses/${slug}`} className="hover:text-foreground">{course.title}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="hover:text-foreground">
          <Link href={`/courses/${slug}`} className="hover:text-foreground">งานระดับวิชา</Link>
        </span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{assignment.title}</span>
      </nav>

      <AssignmentPanel
        assignment={{
          ...assignment,
          questions: assignment.questions.map((q) => ({
            ...q,
            maxLength: q.maxLength ?? null,
            maxFiles: q.maxFiles ?? null,
          })),
        }}
        submission={
          submission
            ? {
                ...submission,
                answers: submission.answers.map((a) => ({
                  questionId: a.questionId,
                  textAnswer: a.textAnswer,
                  files: a.files,
                })),
              }
            : null
        }
        courseSlug={slug}
        lessonId={null}
      />
    </div>
  );
}
