import { createQuiz } from "@/app/teach/actions";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function NewQuizPage({
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

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/teach/${courseId}`} className="text-muted-foreground hover:underline text-sm">
          {course.title}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold">สร้างแบบทดสอบ</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลแบบทดสอบ</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createQuiz.bind(null, id)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">ชื่อแบบทดสอบ *</Label>
              <Input id="title" name="title" required placeholder="เช่น แบบทดสอบก่อนเรียน บทที่ 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">ประเภท</Label>
                <Select name="type" defaultValue="QUIZ">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRE_TEST">Pre-test (ก่อนเรียน)</SelectItem>
                    <SelectItem value="POST_TEST">Post-test (หลังเรียน)</SelectItem>
                    <SelectItem value="QUIZ">Quiz (ระหว่างเรียน)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passingScore">คะแนนผ่าน (%)</Label>
                <Input
                  id="passingScore"
                  name="passingScore"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={60}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAttempts">จำนวนครั้งที่ทำได้ (0 = ไม่จำกัด)</Label>
              <Input
                id="maxAttempts"
                name="maxAttempts"
                type="number"
                min={0}
                defaultValue={0}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">สร้างแบบทดสอบ</Button>
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
