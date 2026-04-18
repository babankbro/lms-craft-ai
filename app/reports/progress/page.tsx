import { prisma } from "@/lib/prisma";
import { requireAuth, canReview } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProgressReportPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; groupName?: string }>;
}) {
  const user = await requireAuth();
  if (!canReview(user.role)) redirect("/dashboard");

  const { studentId, groupName } = await searchParams;

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(user.role === "MENTOR" ? { mentorId: user.id } : {}),
      ...(groupName ? { groupName } : {}),
      ...(studentId ? { id: studentId } : {}),
    },
    select: { id: true, fullName: true, email: true, groupName: true },
    orderBy: { fullName: "asc" },
  });

  const groups = await prisma.user.findMany({
    where: { role: "STUDENT", groupName: { not: null } },
    select: { groupName: true },
    distinct: ["groupName"],
    orderBy: { groupName: "asc" },
  });

  // For each student get progress summary
  const studentData = await Promise.all(
    students.map(async (s) => {
      const enrollments = await prisma.enrollment.count({ where: { userId: s.id } });
      const completedLessons = await prisma.lessonProgress.count({
        where: { userId: s.id, isCompleted: true },
      });
      const quizzesPassed = await prisma.quizAttempt.count({
        where: { studentId: s.id, isPassed: true, isSubmitted: true },
      });
      const submissionsApproved = await prisma.submission.count({
        where: { studentId: s.id, status: "APPROVED" },
      });
      const submissionsPending = await prisma.submission.count({
        where: { studentId: s.id, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      });
      const evalAvg = await prisma.evaluation.aggregate({
        where: { evaluateeId: s.id },
        _avg: { score: true },
      });
      return {
        ...s,
        enrollments,
        completedLessons,
        quizzesPassed,
        submissionsApproved,
        submissionsPending,
        evalAvg: evalAvg._avg.score ? Math.round(evalAvg._avg.score * 10) / 10 : null,
      };
    })
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">รายงานความคืบหน้า</h1>

      {/* Filters */}
      <form className="flex gap-3 mb-6 flex-wrap">
        <select
          name="groupName"
          defaultValue={groupName ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          onChange={() => {}}
        >
          <option value="">ทุกกลุ่ม</option>
          {groups.map((g) => (
            <option key={g.groupName} value={g.groupName!}>{g.groupName}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
        >
          กรอง
        </button>
        {(groupName || studentId) && (
          <Link href="/reports/progress" className="text-sm text-muted-foreground self-center hover:underline">
            ล้างตัวกรอง
          </Link>
        )}
      </form>

      <div className="grid gap-4">
        {studentData.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">{s.fullName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{s.email}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {s.groupName && <Badge variant="outline">{s.groupName}</Badge>}
                  <Link href={`/mentees/${s.id}`} className="text-sm text-primary hover:underline">
                    ดูรายละเอียด
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{s.enrollments}</p>
                  <p className="text-xs text-muted-foreground">วิชาที่ลงทะเบียน</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.completedLessons}</p>
                  <p className="text-xs text-muted-foreground">บทเรียนที่ผ่าน</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.quizzesPassed}</p>
                  <p className="text-xs text-muted-foreground">แบบทดสอบผ่าน</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.submissionsApproved}</p>
                  <p className="text-xs text-muted-foreground">งานผ่าน</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.evalAvg ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">คะแนนเฉลี่ย</p>
                </div>
              </div>
              {s.submissionsPending > 0 && (
                <Badge variant="destructive" className="mt-2">{s.submissionsPending} งานรอตรวจ</Badge>
              )}
            </CardContent>
          </Card>
        ))}
        {studentData.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              ไม่พบนักเรียน
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
