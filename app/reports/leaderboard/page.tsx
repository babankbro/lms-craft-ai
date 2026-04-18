import { requireAuth, canReview } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await requireAuth();
  if (!canReview(user.role)) redirect("/dashboard");

  const evaluations = await prisma.evaluation.groupBy({
    by: ["evaluateeId"],
    _avg: { score: true },
    _count: { score: true },
  });

  const catUsers = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      id: { in: evaluations.map((e) => e.evaluateeId) },
    },
    select: { id: true, fullName: true, groupName: true },
  });

  const selfEvals = await prisma.selfEvaluation.findMany({
    select: { userId: true, score: true },
  });

  const leaderboard = evaluations
    .map((e) => {
      const cat = catUsers.find((u) => u.id === e.evaluateeId);
      const selfScore = selfEvals.find((s) => s.userId === e.evaluateeId)?.score;
      return {
        id: e.evaluateeId,
        fullName: cat?.fullName || "Unknown",
        groupName: cat?.groupName || "-",
        avgScore: e._avg.score ? Math.round(e._avg.score * 100) / 100 : 0,
        evalCount: e._count.score,
        selfScore: selfScore ? Math.round(selfScore * 100) / 100 : null,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">กระดานผลการประเมิน</h1>
      <Card>
        <CardHeader>
          <CardTitle>อันดับคะแนนเฉลี่ย</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>อันดับ</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>กลุ่ม / โรงเรียน</TableHead>
                <TableHead>คะแนนเฉลี่ย</TableHead>
                <TableHead>จำนวนผู้ประเมิน</TableHead>
                <TableHead>ประเมินตนเอง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, idx) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {idx === 0 ? (
                      <Badge>🥇 1</Badge>
                    ) : idx === 1 ? (
                      <Badge variant="secondary">🥈 2</Badge>
                    ) : idx === 2 ? (
                      <Badge variant="outline">🥉 3</Badge>
                    ) : (
                      idx + 1
                    )}
                  </TableCell>
                  <TableCell>{entry.fullName}</TableCell>
                  <TableCell>{entry.groupName}</TableCell>
                  <TableCell>{entry.avgScore}</TableCell>
                  <TableCell>{entry.evalCount}</TableCell>
                  <TableCell>
                    {entry.selfScore != null ? entry.selfScore : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {leaderboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    ยังไม่มีข้อมูลการประเมิน
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
