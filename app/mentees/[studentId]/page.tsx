import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง", SUBMITTED: "ส่งแล้ว", UNDER_REVIEW: "กำลังตรวจ",
  REVISION_REQUESTED: "แก้ไข", APPROVED: "ผ่าน", REJECTED: "ไม่ผ่าน",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline", SUBMITTED: "secondary", UNDER_REVIEW: "default",
  REVISION_REQUESTED: "destructive", APPROVED: "default", REJECTED: "destructive",
};

export default async function MenteeDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const user = await requireAuth();
  if (!["MENTOR", "INSTRUCTOR", "ADMIN"].includes(user.role)) redirect("/dashboard");

  const { studentId } = await params;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, fullName: true, email: true, groupName: true, mentorId: true, role: true },
  });
  if (!student || student.role !== "STUDENT") notFound();

  // MENTOR can only view own mentees
  if (user.role === "MENTOR" && student.mentorId !== user.id) redirect("/mentees");

  // Enrolled courses with lesson progress
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: studentId },
    include: {
      course: {
        include: { lessons: { select: { id: true, title: true, order: true } } },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  // Lesson progress
  const progressRows = await prisma.lessonProgress.findMany({
    where: { userId: studentId, isCompleted: true },
    select: { lessonId: true },
  });
  const completedLessonIds = new Set(progressRows.map((p) => p.lessonId));

  // Quiz attempts summary
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { studentId, isSubmitted: true },
    include: { quiz: { select: { title: true, type: true } } },
    orderBy: { submittedAt: "desc" },
    take: 20,
  });

  // Submissions
  const submissions = await prisma.submission.findMany({
    where: { studentId },
    include: {
      assignment: {
        include: {
          lesson: { include: { course: { select: { title: true } } } },
          course: { select: { title: true } },
        },
      },
      files: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/mentees" className="text-sm text-muted-foreground hover:underline">← กลับ</Link>
        <h1 className="text-2xl font-bold mt-1">{student.fullName}</h1>
        <p className="text-muted-foreground">{student.email}</p>
        {student.groupName && <Badge variant="outline" className="mt-1">{student.groupName}</Badge>}
      </div>

      {/* Course Progress */}
      <Card>
        <CardHeader><CardTitle>ความคืบหน้าวิชา ({enrollments.length})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {enrollments.map((e) => {
            const total = e.course.lessons.length;
            const done = e.course.lessons.filter((l) => completedLessonIds.has(l.id)).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={e.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{e.course.title}</span>
                  <span className="text-muted-foreground">{done}/{total} บทเรียน ({pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {enrollments.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่ได้ลงทะเบียนวิชาใด</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Quiz Attempts */}
      <Card>
        <CardHeader><CardTitle>ผลการทำแบบทดสอบ</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {quizAttempts.map((a) => (
            <div key={a.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
              <div>
                <span className="font-medium">{a.quiz.title}</span>
                <Badge variant="outline" className="ml-2 text-xs">{a.quiz.type}</Badge>
              </div>
              <div className="text-right">
                <span className={a.isPassed ? "text-green-600" : "text-red-500"}>
                  {a.percentage != null ? `${a.percentage.toFixed(0)}%` : "—"}
                </span>
                {a.isPassed != null && (
                  <Badge variant={a.isPassed ? "default" : "destructive"} className="ml-2 text-xs">
                    {a.isPassed ? "ผ่าน" : "ไม่ผ่าน"}
                  </Badge>
                )}
              </div>
            </div>
          ))}
          {quizAttempts.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มีผลแบบทดสอบ</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Submissions */}
      <Card>
        <CardHeader><CardTitle>ประวัติการส่งงาน ({submissions.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {submissions.map((sub) => (
            <div key={sub.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
              <div>
                <span className="font-medium">{sub.assignment.title}</span>
                <span className="text-muted-foreground ml-2">
                  — {sub.assignment.lesson?.course.title ?? sub.assignment.course?.title ?? ""}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant={STATUS_VARIANT[sub.status] ?? "outline"}>
                  {STATUS_LABEL[sub.status] ?? sub.status}
                </Badge>
                {sub.score != null && (
                  <span className="text-muted-foreground">{sub.score}{sub.maxScore ? `/${sub.maxScore}` : ""}</span>
                )}
                <Link href={`/review/${sub.id}`} className="text-primary hover:underline">ตรวจ</Link>
              </div>
            </div>
          ))}
          {submissions.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มีงานส่ง</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
