import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteLesson } from "@/app/teach/actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function LessonListPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const { courseId: rawId } = await params;
  const { page: rawPage } = await searchParams;
  const courseId = parseInt(rawId);
  const page = Math.max(1, parseInt(rawPage ?? "1") || 1);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, authorId: true },
  });
  if (!course) notFound();
  if (course.authorId !== user.id && user.role !== "ADMIN") redirect("/teach");

  const [lessons, total] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: { courseId },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        section: { select: { title: true } },
        _count: { select: { attachments: true, lessonQuizzes: true, assignments: true } },
      },
    }),
    prisma.lesson.count({ where: { courseId } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/teach/${courseId}`} className="text-sm text-muted-foreground hover:underline">
            ← {course.title}
          </Link>
          <h1 className="text-2xl font-bold mt-1">บทเรียนทั้งหมด</h1>
          <p className="text-sm text-muted-foreground">{total} บทเรียน</p>
        </div>
        <Link href={`/teach/${courseId}/lessons/new`}>
          <Button>+ เพิ่มบทเรียน</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>รายการบทเรียน</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ลำดับ</TableHead>
                <TableHead>ชื่อบทเรียน</TableHead>
                <TableHead>หมวด</TableHead>
                <TableHead className="text-center">ไฟล์</TableHead>
                <TableHead className="text-center">Quiz</TableHead>
                <TableHead className="text-center">งาน</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell className="text-muted-foreground">{lesson.order}</TableCell>
                  <TableCell className="font-medium">{lesson.title}</TableCell>
                  <TableCell>
                    {lesson.section ? (
                      <Badge variant="secondary" className="text-xs">{lesson.section.title}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{lesson._count.attachments}</TableCell>
                  <TableCell className="text-center">{lesson._count.lessonQuizzes}</TableCell>
                  <TableCell className="text-center">{lesson._count.assignments}</TableCell>
                  <TableCell>
                    <div className="flex gap-3">
                      <Link href={`/teach/${courseId}/lessons/${lesson.id}`} className="text-primary hover:underline text-sm">แก้ไข</Link>
                      <form action={deleteLesson.bind(null, lesson.id)}>
                        <button type="submit" className="text-destructive hover:underline text-sm">ลบ</button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {lessons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    ยังไม่มีบทเรียน
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {page > 1 && (
                <Link href={`/teach/${courseId}/lessons?page=${page - 1}`}>
                  <Button variant="outline" size="sm">← ก่อนหน้า</Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground self-center">หน้า {page} / {totalPages}</span>
              {page < totalPages && (
                <Link href={`/teach/${courseId}/lessons?page=${page + 1}`}>
                  <Button variant="outline" size="sm">ถัดไป →</Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
