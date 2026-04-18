import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createEvaluationRound, toggleEvaluationRound } from "@/app/evaluations/actions";

export const dynamic = "force-dynamic";

export default async function AdminEvaluationsPage() {
  await requireRole("ADMIN");

  const rounds = await prisma.evaluationRound.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { evaluations: true, selfEvaluations: true } },
    },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">จัดการรอบประเมิน</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>สร้างรอบประเมินใหม่</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEvaluationRound} className="space-y-4">
            <div>
              <label className="text-sm font-medium">ชื่อรอบ</label>
              <input
                name="name"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">วันเริ่ม</label>
                <input
                  name="startDate"
                  type="date"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">วันสิ้นสุด</label>
                <input
                  name="endDate"
                  type="date"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">คะแนนเต็ม</label>
              <input
                name="maxScore"
                type="number"
                defaultValue={100}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
            >
              สร้างรอบประเมิน
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รอบประเมินทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>วันเริ่ม</TableHead>
                <TableHead>วันสิ้นสุด</TableHead>
                <TableHead>คะแนนเต็ม</TableHead>
                <TableHead>ประเมินแล้ว</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rounds.map((round) => (
                <TableRow key={round.id}>
                  <TableCell>{round.name}</TableCell>
                  <TableCell>
                    {new Date(round.startDate).toLocaleDateString("th-TH")}
                  </TableCell>
                  <TableCell>
                    {new Date(round.endDate).toLocaleDateString("th-TH")}
                  </TableCell>
                  <TableCell>{round.maxScore}</TableCell>
                  <TableCell>{round._count.evaluations}</TableCell>
                  <TableCell>
                    <Badge variant={round.isActive ? "default" : "secondary"}>
                      {round.isActive ? "เปิด" : "ปิด"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <form action={async () => {
                      "use server";
                      await toggleEvaluationRound(round.id, !round.isActive);
                    }}>
                      <button
                        type="submit"
                        className="text-primary hover:underline text-sm"
                      >
                        {round.isActive ? "ปิดรอบ" : "เปิดรอบ"}
                      </button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {rounds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    ยังไม่มีรอบประเมิน
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
