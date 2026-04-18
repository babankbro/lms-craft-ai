import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { createLesson } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const { id } = await params;
  const courseId = parseInt(id);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { lessons: { orderBy: { order: "asc" }, select: { order: true } } },
  });
  if (!course) notFound();

  const nextOrder =
    course.lessons.length > 0
      ? Math.max(...course.lessons.map((l) => l.order)) + 10
      : 10;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/admin/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← กลับไปยัง {course.title}
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">เพิ่มบทเรียนใหม่</h1>
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลบทเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLesson.bind(null, courseId)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อบทเรียน *</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">ลำดับ</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  defaultValue={nextOrder}
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
                defaultValue=""
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="เขียนเนื้อหาด้วย Markdown..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input
                id="youtubeUrl"
                name="youtubeUrl"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <Button type="submit">สร้างบทเรียน</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
