import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createCourseAssignment } from "../actions";

export default async function NewCourseAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const courseId = parseInt(id);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  });
  if (!course) notFound();

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/admin/courses/${courseId}/assignments`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← งานระดับวิชา
        </Link>
        <h1 className="text-2xl font-bold mt-1">สร้างงานใหม่ — {course.title}</h1>
      </div>

      <form
        action={async (formData: FormData) => {
          "use server";
          await createCourseAssignment(courseId, formData);
        }}
        className="space-y-5"
      >
        <div className="space-y-1">
          <Label htmlFor="title">ชื่องาน *</Label>
          <Input id="title" name="title" required placeholder="เช่น งานส่งท้ายวิชา" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">คำอธิบาย</Label>
          <Textarea id="description" name="description" rows={4} placeholder="รายละเอียดงาน..." />
        </div>

        <div className="space-y-1">
          <Label htmlFor="dueDate">กำหนดส่ง</Label>
          <Input id="dueDate" name="dueDate" type="datetime-local" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="maxFileSizeMB">ขนาดไฟล์สูงสุด (MB)</Label>
          <Input
            id="maxFileSizeMB"
            name="maxFileSizeMB"
            type="number"
            defaultValue="10"
            min="1"
            max="100"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="allowedTypes">ประเภทไฟล์ที่รับ (คั่นด้วยคอมม่า)</Label>
          <Input
            id="allowedTypes"
            name="allowedTypes"
            defaultValue="application/pdf,image/jpeg,image/png"
            placeholder="application/pdf,image/jpeg,image/png"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="questions">คำถาม (JSON array)</Label>
          <Textarea
            id="questions"
            name="questions"
            rows={6}
            defaultValue={JSON.stringify(
              [{ prompt: "อธิบายสิ่งที่ได้เรียนรู้", responseType: "TEXT", required: true }],
              null,
              2
            )}
          />
          <p className="text-xs text-muted-foreground">
            รูปแบบ: {"[{\"prompt\": \"...\", \"responseType\": \"TEXT|FILE|BOTH\", \"required\": true}]"}
          </p>
        </div>

        <div className="flex gap-3">
          <Button type="submit">สร้างงาน</Button>
          <Link href={`/admin/courses/${courseId}/assignments`}>
            <Button type="button" variant="outline">ยกเลิก</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
