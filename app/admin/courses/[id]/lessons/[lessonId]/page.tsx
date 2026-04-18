import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { updateLesson, deleteLesson } from "./actions";
import { AttachmentsPanel } from "./_components/attachments-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const { id, lessonId } = await params;
  const courseId = parseInt(id);

  const lesson = await prisma.lesson.findUnique({
    where: { id: parseInt(lessonId) },
    include: { attachments: { orderBy: { createdAt: "desc" } } },
  });
  if (!lesson || lesson.courseId !== courseId) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/admin/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← กลับไปยังรายวิชา
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">แก้ไขบทเรียน</h1>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลบทเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateLesson.bind(null, lesson.id)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อบทเรียน *</Label>
                <Input id="title" name="title" defaultValue={lesson.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">ลำดับ</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  defaultValue={lesson.order}
                  required
                />
              </div>
            </div>
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
            <Button type="submit" variant="destructive">
              ลบบทเรียน
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        <AttachmentsPanel lessonId={lesson.id} attachments={lesson.attachments} />
      </div>
    </div>
  );
}
