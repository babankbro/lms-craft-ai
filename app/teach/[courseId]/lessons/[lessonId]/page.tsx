/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { updateLesson, deleteLesson, deleteLessonAttachment } from "@/app/teach/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const { courseId, lessonId } = await params;
  const cId = parseInt(courseId);
  const lId = parseInt(lessonId);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lId },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      course: { select: { id: true, title: true, authorId: true } },
      lessonQuizzes: { include: { quiz: true } },
    },
  });

  if (!lesson || lesson.courseId !== cId) notFound();
  if (lesson.course.authorId !== user.id && user.role !== "ADMIN") redirect("/teach");

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/teach/${cId}`} className="text-muted-foreground hover:underline text-sm">
          {lesson.course.title}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">แก้ไขบทเรียน: {lesson.title}</h1>
      </div>

      {/* Lesson Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>เนื้อหาบทเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateLesson.bind(null, lId)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อบทเรียน *</Label>
                <Input id="title" name="title" defaultValue={lesson.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">ลำดับที่</Label>
                <Input id="order" name="order" type="number" min={1} defaultValue={lesson.order} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl">YouTube URL</Label>
                <Input
                  id="youtubeUrl"
                  name="youtubeUrl"
                  defaultValue={lesson.youtubeUrl || ""}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedMinutes">เวลาโดยประมาณ (นาที)</Label>
                <Input
                  id="estimatedMinutes"
                  name="estimatedMinutes"
                  type="number"
                  min={0}
                  defaultValue={(lesson as any).estimatedMinutes ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">เนื้อหา (Markdown)</Label>
              <Textarea
                id="content"
                name="content"
                rows={16}
                defaultValue={lesson.content}
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit">บันทึก</Button>
          </form>
          <form action={deleteLesson.bind(null, lId)} className="mt-4 pt-4 border-t">
            <Button type="submit" variant="destructive" size="sm">ลบบทเรียน</Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle>ไฟล์แนบ ({lesson.attachments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lesson.attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="text-sm font-medium">{att.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(att.fileSize)}</p>
              </div>
              <form action={deleteLessonAttachment.bind(null, att.id)}>
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  ลบ
                </Button>
              </form>
            </div>
          ))}
          {lesson.attachments.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มีไฟล์แนบ</p>
          )}
          <div className="mt-4 p-4 border-2 border-dashed rounded-md text-center text-muted-foreground text-sm">
            อัปโหลดไฟล์แนบผ่าน API: POST /api/upload (prefix: lessons/{lId})
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Linked Quizzes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>แบบทดสอบที่เชื่อมกับบทเรียนนี้</CardTitle>
            <Link href={`/teach/${cId}/quizzes/new`}>
              <Button size="sm" variant="outline">+ สร้างแบบทดสอบ</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {lesson.lessonQuizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีแบบทดสอบ</p>
          ) : (
            <div className="space-y-2">
              {lesson.lessonQuizzes.map((lq) => (
                <div key={lq.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <span className="font-medium text-sm">{lq.quiz.title}</span>
                    <Badge variant="outline" className="ml-2">{lq.quiz.type}</Badge>
                  </div>
                  <Link
                    href={`/teach/${cId}/quizzes/${lq.quiz.id}`}
                    className="text-primary hover:underline text-sm"
                  >
                    แก้ไข
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
