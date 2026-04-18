import { createLesson } from "@/app/teach/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const { courseId } = await params;
  const id = parseInt(courseId);

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) notFound();
  if (course.authorId !== user.id && user.role !== "ADMIN") redirect("/teach");

  const lastLesson = await prisma.lesson.findFirst({
    where: { courseId: id },
    orderBy: { order: "desc" },
  });
  const nextOrder = lastLesson ? lastLesson.order + 1 : 1;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/teach/${courseId}`} className="text-muted-foreground hover:underline text-sm">
          {course.title}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold">เพิ่มบทเรียนใหม่</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลบทเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLesson.bind(null, id)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อบทเรียน *</Label>
                <Input id="title" name="title" required placeholder="เช่น บทที่ 1: แนะนำรายวิชา" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">ลำดับที่</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  min={1}
                  defaultValue={nextOrder}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL (ไม่บังคับ)</Label>
              <Input
                id="youtubeUrl"
                name="youtubeUrl"
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
                placeholder="เช่น 30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">เนื้อหา (Markdown)</Label>
              <Textarea
                id="content"
                name="content"
                rows={12}
                placeholder="เขียนเนื้อหาบทเรียนด้วย Markdown..."
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">สร้างบทเรียน</Button>
              <Link href={`/teach/${courseId}`}>
                <Button type="button" variant="outline">ยกเลิก</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
