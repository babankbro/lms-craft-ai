import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export async function CATDashboard({ userId }: { userId: string }) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          lessons: {
            select: { id: true },
          },
        },
      },
    },
  });

  const completedLessonIds = await prisma.lessonProgress.findMany({
    where: { userId, isCompleted: true },
    select: { lessonId: true },
  }).then((r) => new Set(r.map((x) => x.lessonId)));

  const withProgress = enrollments.map((en) => {
    const total = en.course.lessons.length;
    const done = en.course.lessons.filter((l) => completedLessonIds.has(l.id)).length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);
    const status: "COMPLETED" | "IN_PROGRESS" = done === total && total > 0 ? "COMPLETED" : "IN_PROGRESS";
    return { ...en, progress, status };
  });

  const unreadNotifs = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  const certificates = await prisma.certificate.count({
    where: { userId },
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">แดชบอร์ดนักเรียน</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>หลักสูตรที่ลงทะเบียน</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{enrollments.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>เกียรติบัตร</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{certificates}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>แจ้งเตือนใหม่</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{unreadNotifs}</p></CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-6">ความคืบหน้า</h2>
      <div className="space-y-4">
        {withProgress.map((en) => (
          <Card key={en.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between mb-2">
                <Link
                  href={`/courses/${en.course.slug}`}
                  className="font-medium hover:underline"
                >
                  {en.course.title}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant={en.status === "COMPLETED" ? "default" : "secondary"}>
                    {en.status === "COMPLETED" ? "เรียนจบแล้ว" : `${en.progress}%`}
                  </Badge>
                </div>
              </div>
              <Progress value={en.progress} />
            </CardContent>
          </Card>
        ))}
        {enrollments.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            ยังไม่ได้ลงทะเบียนหลักสูตร
          </p>
        )}
      </div>
    </div>
  );
}
