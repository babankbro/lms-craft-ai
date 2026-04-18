import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createQuiz } from "../actions";

export default async function NewQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const { id } = await params;
  const courseId = parseInt(id);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  });
  if (!course) notFound();

  return (
    <div className="p-8 max-w-xl mx-auto">
      <Link href={`/admin/courses/${courseId}`} className="text-sm text-muted-foreground hover:underline">
        ← {course.title}
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">สร้างแบบทดสอบใหม่</h1>

      <Card>
        <CardHeader><CardTitle>ข้อมูลแบบทดสอบ</CardTitle></CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              "use server";
              const quizId = await createQuiz(courseId, formData);
              revalidatePath(`/admin/courses/${courseId}`);
              redirect(`/admin/courses/${courseId}/quizzes/${quizId}`);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">ชื่อแบบทดสอบ *</Label>
              <Input id="title" name="title" required placeholder="เช่น แบบทดสอบก่อนเรียนบทที่ 1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">ประเภท</Label>
                <select
                  id="type"
                  name="type"
                  defaultValue="QUIZ"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="QUIZ">แบบทดสอบทั่วไป</option>
                  <option value="PRE_TEST">Pre-Test (ก่อนเรียน)</option>
                  <option value="POST_TEST">Post-Test (หลังเรียน)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAttempts">จำนวนครั้งสูงสุด (0 = ไม่จำกัด)</Label>
                <Input id="maxAttempts" name="maxAttempts" type="number" min={0} defaultValue={3} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passingScore">คะแนนผ่าน (%)</Label>
              <Input id="passingScore" name="passingScore" type="number" min={0} max={100} defaultValue={60} />
            </div>

            <div className="flex gap-3">
              <Button type="submit">สร้างแบบทดสอบ</Button>
              <Link href={`/admin/courses/${courseId}`}>
                <Button type="button" variant="outline">ยกเลิก</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
