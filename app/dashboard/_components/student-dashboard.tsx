import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BellRing, BookOpen, FileCheck2, GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";

export async function StudentDashboard({ userId }: { userId: string }) {
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(31,87,79,0.96),rgba(52,118,108,0.92))] px-6 py-7 text-primary-foreground shadow-[0_30px_70px_-40px_rgba(15,53,47,0.7)] sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">
              Student Dashboard
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">ภาพรวมการเรียนรู้ของคุณ</h1>
            <p className="max-w-2xl text-sm leading-7 text-primary-foreground/78 sm:text-base">
              ติดตามความคืบหน้าของหลักสูตร ดูสถานะการเรียน และกลับเข้าสู่บทเรียนที่กำลังเรียนอยู่ได้อย่างรวดเร็ว
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-[1.4rem] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/68">คอร์ส</p>
              <p className="mt-2 text-3xl font-semibold">{enrollments.length}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/68">เกียรติบัตร</p>
              <p className="mt-2 text-3xl font-semibold">{certificates}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/68">แจ้งเตือน</p>
              <p className="mt-2 text-3xl font-semibold">{unreadNotifs}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/90">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <p className="text-sm text-muted-foreground">หลักสูตรที่ลงทะเบียน</p>
              <CardTitle className="mt-2 text-3xl">{enrollments.length}</CardTitle>
            </div>
            <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-card/90">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <p className="text-sm text-muted-foreground">เกียรติบัตรที่ได้รับ</p>
              <CardTitle className="mt-2 text-3xl">{certificates}</CardTitle>
            </div>
            <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-card/90">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <p className="text-sm text-muted-foreground">รายการที่ควรติดตาม</p>
              <CardTitle className="mt-2 text-3xl">{unreadNotifs}</CardTitle>
            </div>
            <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
              <BellRing className="h-5 w-5" />
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">ความคืบหน้าของหลักสูตร</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              เลือกคอร์สเพื่อกลับไปเรียนต่อหรือดูสถานะการเรียนล่าสุด
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {withProgress.map((en) => (
            <Card key={en.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={en.status === "COMPLETED" ? "default" : "secondary"}
                        className={en.status === "COMPLETED" ? "border-transparent" : "border border-border/70"}
                      >
                        {en.status === "COMPLETED" ? "เรียนจบแล้ว" : "กำลังเรียน"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {en.course.lessons.length} บทเรียน
                      </span>
                    </div>
                    <div>
                      <Link
                        href={`/courses/${en.course.slug}`}
                        className="inline-flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary"
                      >
                        {en.course.title}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="w-full max-w-xl space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ความคืบหน้า</span>
                      <span className="font-medium text-foreground">{en.progress}%</span>
                    </div>
                    <Progress value={en.progress} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {enrollments.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">ยังไม่ได้ลงทะเบียนหลักสูตร</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  เมื่อมีการลงทะเบียนหลักสูตร รายการเรียนและความคืบหน้าจะปรากฏในแดชบอร์ดนี้
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
