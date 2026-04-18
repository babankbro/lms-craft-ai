/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { updateLesson, deleteLesson } from "./actions";
import { AttachmentsPanel } from "./_components/attachments-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const { id, lessonId } = await params;
  const courseId = parseInt(id);
  const lId = parseInt(lessonId);

  const [lesson, sections, assignments] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id: lId },
      include: {
        attachments: { orderBy: { createdAt: "desc" } },
        lessonQuizzes: { select: { id: true } },
      },
    }),
    prisma.courseSection.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
    prisma.assignment.findMany({
      where: { lessonId: lId },
      include: { _count: { select: { submissions: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!lesson || lesson.courseId !== courseId) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="mb-2">
        <Link href={`/admin/courses/${courseId}`} className="text-sm text-muted-foreground hover:underline">
          ← กลับไปยังรายวิชา
        </Link>
      </div>
      <h1 className="text-2xl font-bold">แก้ไขบทเรียน</h1>

      {/* Lesson edit form */}
      <Card>
        <CardHeader><CardTitle>ข้อมูลบทเรียน</CardTitle></CardHeader>
        <CardContent>
          <form action={updateLesson.bind(null, lesson.id)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อบทเรียน *</Label>
                <Input id="title" name="title" defaultValue={lesson.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">ลำดับ</Label>
                <Input id="order" name="order" type="number" defaultValue={lesson.order} required />
              </div>
            </div>

            {sections.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="sectionId">หมวดเนื้อหา</Label>
                <select
                  id="sectionId"
                  name="sectionId"
                  defaultValue={(lesson as any).sectionId ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">ไม่มีหมวด</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="content">เนื้อหา (Markdown)</Label>
              <textarea
                id="content"
                name="content"
                rows={12}
                defaultValue={lesson.content}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input
                id="youtubeUrl"
                name="youtubeUrl"
                defaultValue={lesson.youtubeUrl || ""}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <Button type="submit">บันทึก</Button>
          </form>
          <form action={deleteLesson.bind(null, lesson.id)} className="mt-2">
            <Button type="submit" variant="destructive">ลบบทเรียน</Button>
          </form>
        </CardContent>
      </Card>

      {/* Attachments */}
      <AttachmentsPanel lessonId={lesson.id} attachments={lesson.attachments} />

      <Separator />

      {/* Assignments panel */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>งานมอบหมาย ({assignments.length})</CardTitle>
            <Link href={`/admin/courses/${courseId}/assignments/new?lessonId=${lId}`}>
              <Button size="sm" variant="outline">+ เพิ่มงาน</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีงานมอบหมาย</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a._count.submissions} การส่งงาน
                      {a.dueDate && ` · กำหนด ${new Date(a.dueDate).toLocaleDateString("th-TH")}`}
                    </p>
                  </div>
                  <Link href={`/admin/courses/${courseId}/assignments/${a.id}`}>
                    <Button variant="outline" size="sm">แก้ไข</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Quiz summary */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              แบบทดสอบที่เชื่อมกับบทเรียน
              <Badge variant="outline" className="ml-2">{lesson.lessonQuizzes.length}</Badge>
            </CardTitle>
            <Link href={`/admin/courses/${courseId}/quizzes/new`}>
              <Button size="sm" variant="outline">+ สร้างแบบทดสอบ</Button>
            </Link>
          </div>
        </CardHeader>
        {lesson.lessonQuizzes.length > 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              บทเรียนนี้มีแบบทดสอบเชื่อมอยู่ {lesson.lessonQuizzes.length} ชุด —{" "}
              <Link href={`/admin/courses/${courseId}`} className="text-primary hover:underline">
                จัดการในหน้าหลักสูตร
              </Link>
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
