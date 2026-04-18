/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { updateCourse, deleteCourse, togglePublish, setCoursePreTest, setCoursePostTest } from "../actions";
import { deleteLesson } from "./lessons/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const { id } = await params;
  const courseId = parseInt(id);

  const course = await (prisma.course.findUnique as any)({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { _count: { select: { assignments: true, lessonQuizzes: true, attachments: true } } },
          },
          sectionQuizzes: {
            include: { quiz: { select: { id: true, title: true, type: true } } },
            orderBy: { order: "asc" },
          },
        },
      },
      lessons: {
        where: { sectionId: null },
        orderBy: { order: "asc" },
        include: { _count: { select: { assignments: true, lessonQuizzes: true, attachments: true } } },
      },
      quizzes: { include: { _count: { select: { questions: true, attempts: true } } } },
      preTestQuiz: { select: { id: true, title: true } },
      postTestQuiz: { select: { id: true, title: true } },
      _count: { select: { enrollments: true } },
    },
  }) as any;

  if (!course) notFound();

  const preTestQuizzes = (course.quizzes as any[]).filter((q: any) => q.type === "PRE_TEST");
  const postTestQuizzes = (course.quizzes as any[]).filter((q: any) => q.type === "POST_TEST");

  const totalLessons =
    (course.sections as any[]).reduce((sum: number, s: any) => sum + s.lessons.length, 0) +
    (course.lessons as any[]).length;

  function lessonCountLabel(lesson: any): string {
    const parts: string[] = [];
    if (lesson._count.assignments > 0) parts.push(`${lesson._count.assignments} งาน`);
    if (lesson._count.lessonQuizzes > 0) parts.push(`${lesson._count.lessonQuizzes} แบบทดสอบ`);
    return parts.join(" · ") || "—";
  }

  function LessonRow({ lesson }: { lesson: any }) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/40 group">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-muted-foreground w-6 shrink-0">{lesson.order}</span>
          <span className="text-sm font-medium truncate">{lesson.title}</span>
          {lesson._count.assignments > 0 || lesson._count.lessonQuizzes > 0 ? (
            <span className="text-xs text-muted-foreground shrink-0">{lessonCountLabel(lesson)}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">แก้ไข</Button>
          </Link>
          <form action={deleteLesson.bind(null, lesson.id)}>
            <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs text-destructive">
              ลบ
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {course._count.enrollments} ผู้เรียน · {totalLessons} บทเรียน · {course.quizzes.length} แบบทดสอบ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={course.isPublished ? "default" : "outline"}>
            {course.isPublished ? "เผยแพร่" : "ร่าง"}
          </Badge>
          <form action={togglePublish.bind(null, course.id, !course.isPublished)}>
            <Button type="submit" variant={course.isPublished ? "outline" : "default"} size="sm">
              {course.isPublished ? "เลิกเผยแพร่" : "เผยแพร่"}
            </Button>
          </form>
          <Link href={`/teach/${course.id}`} target="_blank">
            <Button variant="ghost" size="sm">เปิดใน Teach ↗</Button>
          </Link>
        </div>
      </div>

      {/* Course Settings */}
      <Card>
        <CardHeader><CardTitle>ตั้งค่าวิชา</CardTitle></CardHeader>
        <CardContent>
          <form action={updateCourse.bind(null, course.id)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อวิชา</Label>
                <Input id="title" name="title" defaultValue={course.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isPublished">สถานะการเผยแพร่</Label>
                <select
                  id="isPublished"
                  name="isPublished"
                  defaultValue={course.isPublished ? "true" : "false"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="false">ร่าง</option>
                  <option value="true">เผยแพร่</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <Input id="description" name="description" defaultValue={course.description || ""} />
            </div>
            <Button type="submit">บันทึก</Button>
          </form>
          <form action={deleteCourse.bind(null, course.id)} className="mt-2">
            <Button type="submit" variant="destructive">ลบวิชา</Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Pre-Test / Post-Test binding */}
      <Card>
        <CardHeader><CardTitle>Pre-Test / Post-Test ของหลักสูตร</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            กำหนดแบบทดสอบก่อนเรียน (Pre-Test) และหลังเรียน (Post-Test) ระดับหลักสูตร
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Pre-Test (ก่อนเรียน)</Label>
              {course.preTestQuiz ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">{course.preTestQuiz.title}</Badge>
                  <form action={setCoursePreTest.bind(null, course.id, null)}>
                    <Button type="submit" variant="ghost" size="sm" className="h-6 text-xs text-destructive">ถอดออก</Button>
                  </form>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">ยังไม่ได้กำหนด</p>
              )}
              {preTestQuizzes.length > 0 && (
                <form action={async (fd: FormData) => {
                  "use server";
                  const qId = parseInt(fd.get("quizId") as string);
                  await setCoursePreTest(courseId, qId);
                }} className="flex gap-2 mt-1">
                  <select name="quizId" className="h-7 rounded border text-xs px-1 flex-1">
                    {preTestQuizzes.map((q: any) => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">กำหนด</Button>
                </form>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Post-Test (หลังเรียน)</Label>
              {course.postTestQuiz ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 border-green-300">{course.postTestQuiz.title}</Badge>
                  <form action={setCoursePostTest.bind(null, course.id, null)}>
                    <Button type="submit" variant="ghost" size="sm" className="h-6 text-xs text-destructive">ถอดออก</Button>
                  </form>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">ยังไม่ได้กำหนด</p>
              )}
              {postTestQuizzes.length > 0 && (
                <form action={async (fd: FormData) => {
                  "use server";
                  const qId = parseInt(fd.get("quizId") as string);
                  await setCoursePostTest(courseId, qId);
                }} className="flex gap-2 mt-1">
                  <select name="quizId" className="h-7 rounded border text-xs px-1 flex-1">
                    {postTestQuizzes.map((q: any) => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">กำหนด</Button>
                </form>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Quizzes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>แบบทดสอบ ({course.quizzes.length})</CardTitle>
            <Link href={`/admin/courses/${course.id}/quizzes/new`}>
              <Button size="sm">+ เพิ่มแบบทดสอบ</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>คำถาม</TableHead>
                <TableHead>จำนวนที่ทำ</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(course.quizzes as any[]).map((quiz: any) => (
                <TableRow key={quiz.id}>
                  <TableCell className="font-medium">
                    {quiz.title}
                    {course.preTestQuizId === quiz.id && (
                      <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-300">Pre-Test หลักสูตร</Badge>
                    )}
                    {course.postTestQuizId === quiz.id && (
                      <Badge className="ml-2 text-xs bg-green-100 text-green-800 border-green-300">Post-Test หลักสูตร</Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline">{quiz.type}</Badge></TableCell>
                  <TableCell>{quiz._count.questions}</TableCell>
                  <TableCell>{quiz._count.attempts}</TableCell>
                  <TableCell>
                    <Link href={`/admin/courses/${course.id}/quizzes/${quiz.id}`} className="text-primary hover:underline text-sm">
                      แก้ไข
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {course.quizzes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">ยังไม่มีแบบทดสอบ</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      {/* Unified Course Tree: Sections + Lessons */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>โครงสร้างหลักสูตร ({totalLessons} บทเรียน)</CardTitle>
            <div className="flex gap-2">
              <Link href={`/admin/courses/${course.id}/lessons/new`}>
                <Button size="sm" variant="outline">+ เพิ่มบทเรียน</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sectioned lessons */}
          {(course.sections as any[]).map((section: any) => (
            <div key={section.id} className="border rounded-md overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">📁 {section.title}</span>
                  <span className="text-xs text-muted-foreground">({section.lessons.length} บทเรียน)</span>
                </div>
              </div>

              {/* Section quizzes (gates) */}
              {(section.sectionQuizzes as any[]).length > 0 && (
                <div className="px-3 py-1 bg-amber-50 border-b flex flex-wrap gap-2">
                  {(section.sectionQuizzes as any[]).map((sq: any) => (
                    <Badge key={sq.id} variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-800">
                      🧩 {sq.quiz.title} · {sq.placement === "BEFORE" ? "ก่อนหมวด" : "หลังหมวด"}
                      {sq.isGate && " · gate"}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Lessons in section */}
              <div className="divide-y">
                {(section.lessons as any[]).map((lesson: any) => (
                  <LessonRow key={lesson.id} lesson={lesson} />
                ))}
                {section.lessons.length === 0 && (
                  <p className="text-xs text-muted-foreground px-3 py-2">ยังไม่มีบทเรียน</p>
                )}
              </div>
            </div>
          ))}

          {/* Unsectioned lessons */}
          {(course.lessons as any[]).length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
                <span className="text-sm font-semibold text-muted-foreground">📄 ไม่มีหมวด</span>
                <span className="text-xs text-muted-foreground">({course.lessons.length} บทเรียน)</span>
              </div>
              <div className="divide-y">
                {(course.lessons as any[]).map((lesson: any) => (
                  <LessonRow key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </div>
          )}

          {totalLessons === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีบทเรียน</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Course-level Assignments */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>งานระดับวิชา</CardTitle>
            <Link href={`/admin/courses/${course.id}/assignments`}>
              <Button variant="outline" size="sm">จัดการงาน →</Button>
            </Link>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
