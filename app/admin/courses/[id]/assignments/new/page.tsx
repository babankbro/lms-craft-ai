import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCourseAssignment } from "../actions";
import { createAssignment } from "@/app/teach/[courseId]/assignments/actions";

export default async function NewCourseAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lessonId?: string }>;
}) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const { id } = await params;
  const { lessonId: lessonIdStr } = await searchParams;
  const courseId = parseInt(id);
  const lessonId = lessonIdStr ? parseInt(lessonIdStr) : null;

  const [course, lesson] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
    lessonId ? prisma.lesson.findUnique({ where: { id: lessonId }, select: { title: true } }) : Promise.resolve(null),
  ]);
  if (!course) notFound();

  const backLink = lessonId
    ? `/admin/courses/${courseId}/lessons/${lessonId}`
    : `/admin/courses/${courseId}/assignments`;

  const sharedFields = (
    <>
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
        <Input id="maxFileSizeMB" name="maxFileSizeMB" type="number" defaultValue="10" min="1" max="100" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="allowedTypes">ประเภทไฟล์ที่รับ (คั่นด้วยคอมม่า)</Label>
        <Input
          id="allowedTypes"
          name="allowedTypes"
          defaultValue="application/pdf,image/jpeg,image/png"
        />
      </div>
    </>
  );

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={backLink} className="text-sm text-muted-foreground hover:underline">← กลับ</Link>
        <h1 className="text-2xl font-bold mt-1">
          {lessonId ? `สร้างงานมอบหมาย — ${lesson?.title ?? "บทเรียน"}` : `สร้างงานระดับวิชา — ${course.title}`}
        </h1>
      </div>

      {lessonId ? (
        <form
          action={async (formData: FormData) => {
            "use server";
            await createAssignment(lessonId, courseId, formData);
          }}
          className="space-y-5"
        >
          {sharedFields}
          <div className="flex gap-3">
            <Button type="submit">สร้างงาน</Button>
            <Link href={backLink}><Button type="button" variant="outline">ยกเลิก</Button></Link>
          </div>
        </form>
      ) : (
        <form
          action={async (formData: FormData) => {
            "use server";
            await createCourseAssignment(courseId, formData);
          }}
          className="space-y-5"
        >
          {sharedFields}
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
              รูปแบบ: {`[{"prompt": "...", "responseType": "TEXT|FILE|BOTH", "required": true}]`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="submit">สร้างงาน</Button>
            <Link href={backLink}><Button type="button" variant="outline">ยกเลิก</Button></Link>
          </div>
        </form>
      )}
    </div>
  );
}
