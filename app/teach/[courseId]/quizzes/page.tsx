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
import { deleteQuiz } from "../../actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function QuizListPage({
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

  const [quizzes, total] = await prisma.$transaction([
    prisma.quiz.findMany({
      where: { courseId },
      orderBy: { id: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    }),
    prisma.quiz.count({ where: { courseId } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const TYPE_LABEL: Record<string, string> = {
    PRE_TEST: "Pre-Test",
    POST_TEST: "Post-Test",
    QUIZ: "Quiz",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/teach/${courseId}`} className="text-sm text-muted-foreground hover:underline">
            ← {course.title}
          </Link>
          <h1 className="text-2xl font-bold mt-1">แบบทดสอบทั้งหมด</h1>
          <p className="text-sm text-muted-foreground">{total} แบบทดสอบ</p>
        </div>
        <Link href={`/teach/${courseId}/quizzes/new`}>
          <Button>+ เพิ่มแบบทดสอบ</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>รายการแบบทดสอบ</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead className="text-center">คำถาม</TableHead>
                <TableHead className="text-center">ผู้ทำ</TableHead>
                <TableHead className="text-center">เกณฑ์ผ่าน</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell className="font-medium">{quiz.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABEL[quiz.type] ?? quiz.type}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{quiz._count.questions}</TableCell>
                  <TableCell className="text-center">{quiz._count.attempts}</TableCell>
                  <TableCell className="text-center">{quiz.passingScore}%</TableCell>
                  <TableCell>
                    <div className="flex gap-3">
                      <Link href={`/teach/${courseId}/quizzes/${quiz.id}`} className="text-primary hover:underline text-sm">แก้ไข</Link>
                      <form action={deleteQuiz.bind(null, quiz.id)}>
                        <button
                          type="submit"
                          className="text-destructive hover:underline text-sm"
                          disabled={quiz._count.attempts > 0}
                          title={quiz._count.attempts > 0 ? "มีผู้ทำแล้ว ไม่สามารถลบได้" : undefined}
                        >
                          ลบ
                        </button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {quizzes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    ยังไม่มีแบบทดสอบ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {page > 1 && (
                <Link href={`/teach/${courseId}/quizzes?page=${page - 1}`}>
                  <Button variant="outline" size="sm">← ก่อนหน้า</Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground self-center">หน้า {page} / {totalPages}</span>
              {page < totalPages && (
                <Link href={`/teach/${courseId}/quizzes?page=${page + 1}`}>
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
