import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MenteesPage() {
  const user = await requireAuth();
  if (!["MENTOR", "INSTRUCTOR", "ADMIN"].includes(user.role)) redirect("/dashboard");

  const mentees = await prisma.user.findMany({
    where: user.role === "ADMIN" ? { role: "STUDENT" } : { mentorId: user.id },
    include: {
      enrollments: {
        include: {
          course: {
            include: {
              lessons: { select: { id: true } },
            },
          },
        },
      },
      submissions: {
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
        select: { id: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  // Compute lesson completion % per student per course
  async function _getCourseProgress(userId: string, courseId: number, totalLessons: number) {
    if (totalLessons === 0) return 0;
    const completed = await prisma.lessonProgress.count({
      where: { userId, lesson: { courseId }, isCompleted: true },
    });
    return Math.round((completed / totalLessons) * 100);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {user.role === "ADMIN" ? "นักเรียนทั้งหมด" : "นักเรียนในความดูแล"}
      </h1>

      {mentees.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            ยังไม่มีนักเรียนที่ได้รับมอบหมาย
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {mentees.map((mentee) => (
          <Card key={mentee.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{mentee.fullName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{mentee.email}</p>
                  {mentee.groupName && (
                    <Badge variant="outline" className="mt-1 text-xs">{mentee.groupName}</Badge>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  {mentee.submissions.length > 0 && (
                    <Badge variant="destructive">{mentee.submissions.length} งานรอตรวจ</Badge>
                  )}
                  <Link href={`/mentees/${mentee.id}`} className="text-sm text-primary hover:underline">
                    ดูรายละเอียด →
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                ลงทะเบียน {mentee.enrollments.length} วิชา
              </p>
              <div className="space-y-1">
                {mentee.enrollments.slice(0, 3).map((e) => (
                  <div key={e.id} className="flex justify-between text-sm">
                    <span>{e.course.title}</span>
                    <span className="text-muted-foreground">{e.course.lessons.length} บทเรียน</span>
                  </div>
                ))}
                {mentee.enrollments.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{mentee.enrollments.length - 3} วิชาอื่น</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
