import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { removePairing } from "./actions";
import { PairingForm } from "./_components/pairing-form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminPairingsPage() {
  await requireRole("ADMIN");

  const [mentors, students] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MENTOR", isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      select: { id: true, fullName: true, email: true, mentorId: true, mentor: { select: { fullName: true } } },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const paired = students.filter((s) => s.mentorId);
  const unpaired = students.filter((s) => !s.mentorId);

  return (
    <div className="space-y-8 p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">จัดคู่ พี่เลี้ยง – นักเรียน</h1>

      {/* Create pairing */}
      <Card>
        <CardHeader>
          <CardTitle>เพิ่มการจับคู่</CardTitle>
        </CardHeader>
        <CardContent>
          <PairingForm mentors={mentors} unpairedStudents={unpaired} />
        </CardContent>
      </Card>

      {/* Current pairings */}
      <Card>
        <CardHeader>
          <CardTitle>การจับคู่ทั้งหมด ({paired.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {paired.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีการจับคู่</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>นักเรียน</TableHead>
                  <TableHead>อีเมลนักเรียน</TableHead>
                  <TableHead>พี่เลี้ยง</TableHead>
                  <TableHead>จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paired.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.fullName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                    <TableCell>{s.mentor?.fullName ?? "—"}</TableCell>
                    <TableCell>
                      <form action={removePairing.bind(null, s.id)}>
                        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                          ยกเลิกคู่
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Unpaired students */}
      {unpaired.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>นักเรียนที่ยังไม่มีพี่เลี้ยง ({unpaired.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {unpaired.map((s) => (
                <li key={s.id}>{s.fullName} — {s.email}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
