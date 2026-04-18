import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAssignment } from "../actions";
import Link from "next/link";

export default async function NewAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lessonId?: string }>;
}) {
  const user = await requireAuth();
  if (!canAuthor(user.role)) redirect("/dashboard");

  const { courseId: courseIdStr } = await params;
  const { lessonId: lessonIdStr } = await searchParams;
  const courseId = parseInt(courseIdStr);
  const lessonId = lessonIdStr ? parseInt(lessonIdStr) : null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } } },
  });
  if (!course) notFound();
  if (user.role !== "ADMIN" && course.authorId !== user.id) redirect("/teach");

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href={`/teach/${courseId}/assignments`} className="text-sm text-muted-foreground hover:underline">
        ← กลับ
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">เพิ่มงานมอบหมาย</h1>
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลงาน</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              "use server";
              const lid = parseInt(formData.get("lessonId") as string);
              await createAssignment(lid, courseId, formData);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="lessonId">บทเรียน *</Label>
              <select
                id="lessonId"
                name="lessonId"
                defaultValue={lessonId ?? ""}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">เลือกบทเรียน</option>
                {course.lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.order}. {l.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">ชื่องาน *</Label>
              <Input id="title" name="title" required placeholder="เช่น รายงานบทที่ 1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="รายละเอียดงาน (รองรับ Markdown)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxFileSizeMB">ขนาดไฟล์สูงสุด (MB)</Label>
                <Input id="maxFileSizeMB" name="maxFileSizeMB" type="number" defaultValue={10} min={1} max={500} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">กำหนดส่ง</Label>
                <Input id="dueDate" name="dueDate" type="datetime-local" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowedTypes">ประเภทไฟล์ที่อนุญาต (คั่นด้วยจุลภาค)</Label>
              <Input
                id="allowedTypes"
                name="allowedTypes"
                defaultValue="application/pdf,image/jpeg,image/png"
                placeholder="application/pdf,image/jpeg,image/png"
              />
            </div>
            <Button type="submit">สร้างงานมอบหมาย</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
