import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
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
import Link from "next/link";

export default async function AdminCoursesPage() {
  await requireRole("INSTRUCTOR", "ADMIN");

  const courses = await prisma.course.findMany({
    include: { _count: { select: { lessons: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">จัดการรายวิชา</h1>
        <Link href="/admin/courses/new">
          <Button>+ สร้างวิชาใหม่</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายวิชาทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อวิชา</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>บทเรียน</TableHead>
                <TableHead>ผู้ลงทะเบียน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>จัดการ</TableHead>
                <TableHead>งาน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>{course.slug}</TableCell>
                  <TableCell>{course._count.lessons}</TableCell>
                  <TableCell>{course._count.enrollments}</TableCell>
                  <TableCell>
                    {course.isPublished ? (
                      <Badge variant="default">เผยแพร่</Badge>
                    ) : (
                      <Badge variant="outline">ร่าง</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="text-primary hover:underline"
                    >
                      จัดการ
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/teach/${course.id}/assignments`}
                      className="text-primary hover:underline"
                    >
                      จัดการงาน
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {courses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    ยังไม่มีรายวิชา
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
