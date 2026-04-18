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
      lessons: { orderBy: { order: "asc" }, include: { _count: { select: { attachments: true } } } },
      quizzes: { include: { _count: { select: { questions: true, attempts: true } } } },
      preTestQuiz: { select: { id: true, title: true } },
      postTestQuiz: { select: { id: true, title: true } },
      _count: { select: { enrollments: true } },
    },
  }) as any;

  if (!course) notFound();

  const preTestQuizzes = (course.quizzes as any[]).filter((q: any) => q.type === "PRE_TEST");
  const postTestQuizzes = (course.quizzes as any[]).filter((q: any) => q.type === "POST_TEST");

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {course._count.enrollments} ผู้เรียน · {course.lessons.length} บทเรียน · {course.quizzes.length} แบบทดสอบ
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
        <CardHeader>
          <CardTitle>ตั้งค่าวิชา</CardTitle>
        </CardHeader>
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
              <Input
                id="description"
                name="description"
                defaultValue={course.description || ""}
              />
            </div>
            <Button type="submit">บันทึก</Button>
          </form>
          <form action={deleteCourse.bind(null, course.id)} className="mt-2">
            <Button type="submit" variant="destructive">
              ลบวิชา
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Pre-Test / Post-Test binding */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Test / Post-Test ของหลักสูตร</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            กำหนดแบบทดสอบก่อนเรียน (Pre-Test) และหลังเรียน (Post-Test) ระดับหลักสูตร
            ผู้เรียนต้องผ่าน Pre-Test เพื่อเข้าบทเรียน และผ่าน Post-Test เพื่อรับใบประกาศ
          </p>
          <div className="grid grid-cols-2 gap-6">
            {/* Pre-Test */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Pre-Test (ก่อนเรียน)</Label>
              {course.preTestQuiz ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    {course.preTestQuiz.title}
                  </Badge>
                  <form action={setCoursePreTest.bind(null, course.id, null)}>
                    <Button type="submit" variant="ghost" size="sm" className="h-6 text-xs text-destructive">
                      ถอดออก
                    </Button>
                  </form>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">ยังไม่ได้กำหนด</p>
              )}
              {preTestQuizzes.length > 0 ? (
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
              ) : (
                <p className="text-xs text-muted-foreground">
                  สร้างแบบทดสอบประเภท <span className="font-mono">PRE_TEST</span> ใน Teach ก่อน
                </p>
              )}
            </div>

            {/* Post-Test */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Post-Test (หลังเรียน)</Label>
              {course.postTestQuiz ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    {course.postTestQuiz.title}
                  </Badge>
                  <form action={setCoursePostTest.bind(null, course.id, null)}>
                    <Button type="submit" variant="ghost" size="sm" className="h-6 text-xs text-destructive">
                      ถอดออก
                    </Button>
                  </form>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">ยังไม่ได้กำหนด</p>
              )}
              {postTestQuizzes.length > 0 ? (
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
              ) : (
                <p className="text-xs text-muted-foreground">
                  สร้างแบบทดสอบประเภท <span className="font-mono">POST_TEST</span> ใน Teach ก่อน
                </p>
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
            <Link href={`/teach/${course.id}/quizzes/new`}>
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
                      <Badge className="ml-2 text-xs bg-amber-100 text-amber-800 border-amber-300">
                        Pre-Test หลักสูตร
                      </Badge>
                    )}
                    {course.postTestQuizId === quiz.id && (
                      <Badge className="ml-2 text-xs bg-green-100 text-green-800 border-green-300">
                        Post-Test หลักสูตร
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{quiz.type}</Badge>
                  </TableCell>
                  <TableCell>{quiz._count.questions}</TableCell>
                  <TableCell>{quiz._count.attempts}</TableCell>
                  <TableCell>
                    <Link
                      href={`/teach/${course.id}/quizzes/${quiz.id}`}
                      className="text-primary hover:underline text-sm"
                    >
                      แก้ไข
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {course.quizzes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    ยังไม่มีแบบทดสอบ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      {/* Lesson Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>บทเรียน ({course.lessons.length})</CardTitle>
            <Link href={`/admin/courses/${course.id}/lessons/new`}>
              <Button size="sm">+ เพิ่มบทเรียน</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ลำดับ</TableHead>
                <TableHead>ชื่อบทเรียน</TableHead>
                <TableHead>YouTube</TableHead>
                <TableHead>ไฟล์แนบ</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(course.lessons as any[]).map((lesson: any) => (
                <TableRow key={lesson.id}>
                  <TableCell>{lesson.order}</TableCell>
                  <TableCell>{lesson.title}</TableCell>
                  <TableCell>
                    {lesson.youtubeUrl ? (
                      <Badge variant="secondary">มี</Badge>
                    ) : (
                      <Badge variant="outline">ไม่มี</Badge>
                    )}
                  </TableCell>
                  <TableCell>{lesson._count.attachments}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/courses/${course.id}/lessons/${lesson.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        แก้ไข
                      </Link>
                      <form action={deleteLesson.bind(null, lesson.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          ลบ
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {course.lessons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    ยังไม่มีบทเรียน
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
