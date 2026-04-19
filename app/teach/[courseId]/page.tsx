import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { updateCourse, publishCourse, deleteCourse } from "../actions";
import { deleteLesson } from "./lessons/actions";
import {
  createSection, deleteSection, moveSectionUp, moveSectionDown,
  moveLessonToSection, attachSectionQuiz, detachSectionQuiz,
} from "./sections/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoverImageUpload } from "./_components/cover-image-upload";
import { LessonListSortable } from "./_components/lesson-list-sortable";
import { SectionListSortable } from "./_components/section-list-sortable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeachCourseWorkbenchPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const { courseId } = await params;
  const id = parseInt(courseId);

  const course = await (prisma.course.findUnique as any)({
    where: { id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              _count: { select: { attachments: true } },
              lessonQuizzes: { include: { quiz: { select: { type: true } } } },
            },
          },
          sectionQuizzes: { include: { quiz: { select: { id: true, title: true, type: true } } } },
        },
      },
      lessons: {
        where: { sectionId: null },
        orderBy: { order: "asc" },
        include: {
          _count: { select: { attachments: true } },
          lessonQuizzes: { include: { quiz: { select: { type: true } } } },
        },
      },
      quizzes: { include: { _count: { select: { questions: true, attempts: true } } } },
      _count: { select: { enrollments: true } },
    },
  }) as any;

  if (!course) notFound();
  if (course.authorId !== user.id && user.role !== "ADMIN") redirect("/teach");

  const assignmentCount = await prisma.assignment.count({
    where: { OR: [{ lesson: { courseId: id } }, { courseId: id, lessonId: null }] },
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {course._count.enrollments} ผู้เรียน · {course.lessons.length} บทเรียน
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={course.isPublished ? "default" : "outline"}>
            {course.isPublished ? "เผยแพร่" : "ร่าง"}
          </Badge>
          <form action={publishCourse.bind(null, course.id, !course.isPublished)}>
            <Button type="submit" variant={course.isPublished ? "outline" : "default"} size="sm">
              {course.isPublished ? "เลิกเผยแพร่" : "เผยแพร่"}
            </Button>
          </form>
          <Link href={`/teach/${course.id}/enrollments`}>
            <Button variant="outline" size="sm">คำขอลงทะเบียน ({course._count.enrollments})</Button>
          </Link>
          <Link href={`/courses/${course.slug}`} target="_blank">
            <Button variant="ghost" size="sm">ดูหน้าเรียน ↗</Button>
          </Link>
        </div>
      </div>

      {/* Course Settings */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลหลักสูตร</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCourse.bind(null, course.id)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อหลักสูตร</Label>
                <Input id="title" name="title" defaultValue={course.title} required />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input value={course.slug} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={course.description || ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">หมวดหมู่</Label>
                <Input id="category" name="category" defaultValue={course.category || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">ระดับ</Label>
                <Select name="level" defaultValue={course.level || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกระดับ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">เริ่มต้น</SelectItem>
                    <SelectItem value="INTERMEDIATE">กลาง</SelectItem>
                    <SelectItem value="ADVANCED">สูง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">บันทึกการเปลี่ยนแปลง</Button>
            </div>
          </form>
          <div className="mt-4 pt-4 border-t space-y-2">
            <Label>รูปปกหลักสูตร</Label>
            <CoverImageUpload courseId={course.id} currentKey={course.coverImageKey ?? null} />
          </div>
          <form action={deleteCourse.bind(null, course.id)} className="mt-4 pt-4 border-t">
            <Button type="submit" variant="destructive" size="sm">
              ลบหลักสูตร
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Sections */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>หมวดเนื้อหา ({course.sections.length})</CardTitle>
            <form action={async (fd: FormData) => {
              "use server";
              const title = fd.get("title") as string;
              const description = fd.get("description") as string | undefined;
              await createSection(course.id, title, description || undefined);
            }} className="flex gap-2">
              <Input name="title" placeholder="ชื่อหมวด" className="h-8 w-40 text-sm" required />
              <Button type="submit" size="sm">+ เพิ่มหมวด</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <SectionListSortable
            courseId={course.id}
            sections={(course.sections as any[]).map((s: any) => ({
              id: s.id,
              title: s.title,
              order: s.order,
              courseId: course.id,
              lessonCount: s.lessons.length,
              sectionQuizzes: s.sectionQuizzes,
            }))}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* All Lessons */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              บทเรียนทั้งหมด ({(course.sections as any[]).flatMap((s: any) => s.lessons).length + course.lessons.length})
            </CardTitle>
            <div className="flex gap-2">
              <Link href={`/teach/${course.id}/lessons`}>
                <Button variant="outline" size="sm">ดูทั้งหมด</Button>
              </Link>
              <Link href={`/teach/${course.id}/lessons/new`}>
                <Button size="sm">+ เพิ่มบทเรียน</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LessonListSortable
            courseId={course.id}
            lessons={[
              ...(course.sections as any[]).flatMap((s: any) =>
                s.lessons.map((l: any) => ({
                  id: l.id,
                  title: l.title,
                  order: l.order,
                  sectionTitle: s.title,
                  attachmentCount: l._count.attachments,
                  preQuizCount: (l.lessonQuizzes as any[]).filter((lq: any) => lq.quiz.type === "PRE_TEST").length,
                  postQuizCount: (l.lessonQuizzes as any[]).filter((lq: any) => lq.quiz.type !== "PRE_TEST").length,
                  courseId: course.id,
                }))
              ),
              ...(course.lessons as any[]).map((l: any) => ({
                id: l.id,
                title: l.title,
                order: l.order,
                sectionTitle: undefined,
                attachmentCount: l._count.attachments,
                preQuizCount: (l.lessonQuizzes as any[]).filter((lq: any) => lq.quiz.type === "PRE_TEST").length,
                postQuizCount: (l.lessonQuizzes as any[]).filter((lq: any) => lq.quiz.type !== "PRE_TEST").length,
                courseId: course.id,
              })),
            ]}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Assignments */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>งานมอบหมาย ({assignmentCount})</CardTitle>
            <div className="flex gap-2">
              <Link href={`/teach/${course.id}/assignments`}>
                <Button variant="outline" size="sm">ดูทั้งหมด</Button>
              </Link>
              <Link href={`/teach/${course.id}/assignments/new`}>
                <Button size="sm">+ เพิ่มงาน</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {assignmentCount === 0
              ? "ยังไม่มีงานมอบหมาย — เพิ่มงานเพื่อให้นักเรียนส่งงาน"
              : `งานทั้งหมด ${assignmentCount} ชิ้นในหลักสูตรนี้`}
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Quizzes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>แบบทดสอบ ({course.quizzes.length})</CardTitle>
            <div className="flex gap-2">
              <Link href={`/teach/${course.id}/quizzes`}>
                <Button variant="outline" size="sm">ดูทั้งหมด</Button>
              </Link>
              <Link href={`/teach/${course.id}/quizzes/new`}>
                <Button size="sm">+ เพิ่มแบบทดสอบ</Button>
              </Link>
            </div>
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
              {(course.quizzes as any[]).map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell className="font-medium">{quiz.title}</TableCell>
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

      {/* Score Config */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>น้ำหนักคะแนน</CardTitle>
            <div className="flex gap-2">
              <Link href={`/teach/${course.id}/scores`}>
                <Button variant="outline" size="sm">คะแนนนักเรียน</Button>
              </Link>
              <Link href={`/teach/${course.id}/score-config`}>
                <Button size="sm">กำหนดน้ำหนัก</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ตั้งค่าน้ำหนักคะแนนสำหรับแบบทดสอบและงานมอบหมายในหลักสูตรนี้
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
