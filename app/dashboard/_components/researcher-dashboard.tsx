import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export async function ResearcherDashboard() {
  const totalUsers = await prisma.user.count();
  const totalCourses = await prisma.course.count();
  const totalSubmissions = await prisma.submission.count();
  const activeRounds = await prisma.evaluationRound.count({
    where: { isActive: true },
  });

  const recentSubmissions = await prisma.submission.findMany({
    take: 5,
    orderBy: { submittedAt: "desc" },
    include: {
      student: { select: { fullName: true } },
      assignment: { select: { title: true } },
    },
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">แดชบอร์ดผู้วิจัย</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle>ผู้ใช้ทั้งหมด</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalUsers}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>หลักสูตร</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalCourses}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>งานส่งทั้งหมด</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalSubmissions}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>รอบประเมินที่เปิด</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{activeRounds}</p></CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-6">งานที่ส่งล่าสุด</h2>
      <div className="space-y-2">
        {recentSubmissions.map((sub) => (
          <Card key={sub.id}>
            <CardContent className="pt-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{sub.student.fullName}</p>
                <p className="text-sm text-muted-foreground">{sub.assignment.title}</p>
              </div>
              <Link href={`/review/${sub.id}`} className="text-primary hover:underline text-sm">
                ตรวจ
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4 mt-6">
        <Link href="/admin/users" className="text-primary hover:underline">จัดการผู้ใช้</Link>
        <Link href="/admin/courses" className="text-primary hover:underline">จัดการหลักสูตร</Link>
        <Link href="/admin/evaluations" className="text-primary hover:underline">จัดการรอบประเมิน</Link>
        <Link href="/reports/leaderboard" className="text-primary hover:underline">กระดานผล</Link>
      </div>
    </div>
  );
}
