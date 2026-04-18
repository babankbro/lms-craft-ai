import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAssignmentButton } from "./_components/delete-button";

export const dynamic = "force-dynamic";

export default async function CourseAssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const courseId = parseInt(id);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  });
  if (!course) notFound();

  const assignments = await prisma.assignment.findMany({
    where: { courseId, lessonId: null },
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href={`/admin/courses/${courseId}`} className="text-sm text-muted-foreground hover:underline">
            ← {course.title}
          </Link>
          <h1 className="text-2xl font-bold mt-1">งานระดับวิชา</h1>
        </div>
        <Link href={`/admin/courses/${courseId}/assignments/new`}>
          <Button>+ สร้างงาน</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการงาน ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีงานระดับวิชา</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่องาน</TableHead>
                  <TableHead>กำหนดส่ง</TableHead>
                  <TableHead>งานที่ส่ง</TableHead>
                  <TableHead>ลบ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>
                      {a.dueDate ? (
                        <Badge variant="outline">
                          {new Date(a.dueDate).toLocaleDateString("th-TH")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">ไม่มีกำหนด</span>
                      )}
                    </TableCell>
                    <TableCell>{a._count.submissions}</TableCell>
                    <TableCell>
                      <DeleteAssignmentButton
                        assignmentId={a.id}
                        courseId={courseId}
                        hasSubmissions={a._count.submissions > 0}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
