import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export async function MentorDashboard({ userId }: { userId: string }) {
  const mentees = await prisma.user.findMany({
    where: { mentorId: userId, role: "STUDENT" },
    select: { id: true, fullName: true, email: true },
  });

  const menteeIds = mentees.map((m) => m.id);

  const pendingSubmissions = await prisma.submission.count({
    where: {
      studentId: { in: menteeIds },
      status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
    },
  });

  const activeRounds = await prisma.evaluationRound.count({
    where: { isActive: true },
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">แดชบอร์ดพี่เลี้ยง</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>นักเรียนที่ดูแล</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{mentees.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>งานรอตรวจ</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{pendingSubmissions}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>รอบประเมินที่เปิดอยู่</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{activeRounds}</p></CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-6">นักเรียนที่ดูแล</h2>
      <div className="space-y-2">
        {mentees.map((mentee) => (
          <Card key={mentee.id}>
            <CardContent className="pt-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{mentee.fullName}</p>
                <p className="text-sm text-muted-foreground">{mentee.email}</p>
              </div>
              <Link
                href={`/review`}
                className="text-primary hover:underline text-sm"
              >
                ตรวจงาน
              </Link>
            </CardContent>
          </Card>
        ))}
        {mentees.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            ยังไม่มีนักเรียนที่ดูแล
          </p>
        )}
      </div>
    </div>
  );
}
