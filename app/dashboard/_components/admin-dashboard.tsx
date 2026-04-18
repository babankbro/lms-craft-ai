import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export async function AdminDashboard() {
  const [userCount, courseCount, submissionCount, activeRounds] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.submission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.evaluationRound.count({ where: { isActive: true } }),
  ]);

  const roleCounts = await prisma.user.groupBy({
    by: ["role"],
    _count: { role: true },
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">แดชบอร์ดผู้ดูแลระบบ</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle>ผู้ใช้ทั้งหมด</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{userCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>หลักสูตร</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{courseCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>งานรอตรวจ</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{submissionCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>รอบประเมินที่เปิด</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{activeRounds}</p></CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-6">สรุปผู้ใช้แต่ละบทบาท</h2>
      <div className="grid grid-cols-4 gap-4">
        {roleCounts.map((rc) => (
          <Card key={rc.role}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{rc.role}</p>
              <p className="text-2xl font-bold">{rc._count.role}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="text-xl font-semibold mt-6">การจัดการ</h2>
      <div className="grid grid-cols-3 gap-4">
        <Link href="/admin/users" className="block p-4 border rounded-lg hover:border-primary transition">
          <p className="font-medium">จัดการผู้ใช้</p>
          <p className="text-sm text-muted-foreground">เพิ่ม แก้ไข จับคู่ผู้ใช้</p>
        </Link>
        <Link href="/admin/courses" className="block p-4 border rounded-lg hover:border-primary transition">
          <p className="font-medium">จัดการหลักสูตร</p>
          <p className="text-sm text-muted-foreground">สร้าง แก้ไข เผยแพร่</p>
        </Link>
        <Link href="/admin/evaluations" className="block p-4 border rounded-lg hover:border-primary transition">
          <p className="font-medium">รอบการประเมิน</p>
          <p className="text-sm text-muted-foreground">สร้างและจัดการรอบประเมิน</p>
        </Link>
      </div>
    </div>
  );
}
