/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  updateQuiz,
  deleteQuiz,
  addQuestion,
  deleteQuestion,
  addChoice,
  deleteChoice,
  attachQuizToLesson,
  detachQuizFromLesson,
} from "@/app/teach/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminQuizEditPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const { id, quizId } = await params;
  const courseId = parseInt(id);
  const qId = parseInt(quizId);

  const quiz = await prisma.quiz.findUnique({
    where: { id: qId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { choices: true },
      },
      lessonQuizzes: { include: { lesson: { select: { id: true, title: true } } } },
    },
  });

  if (!quiz || quiz.courseId !== courseId) notFound();

  const [courseLessons, attemptCount] = await Promise.all([
    prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true },
    }),
    prisma.quizAttempt.count({ where: { quizId: qId } }),
  ]);

  const linkedLessonIds = new Set(quiz.lessonQuizzes.map((lq: any) => lq.lessonId));

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/admin/courses/${courseId}`} className="text-sm text-muted-foreground hover:underline">
          ← กลับไปยังรายวิชา
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold">แก้ไขแบบทดสอบ</h1>
          <Badge variant="outline">{quiz.type}</Badge>
        </div>
      </div>

      {/* Quiz settings */}
      <Card>
        <CardHeader><CardTitle>ตั้งค่าแบบทดสอบ</CardTitle></CardHeader>
        <CardContent>
          <form action={updateQuiz.bind(null, qId)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อ</Label>
                <Input id="title" name="title" defaultValue={quiz.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">ประเภท</Label>
                <select
                  id="type"
                  name="type"
                  defaultValue={quiz.type}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="QUIZ">แบบทดสอบทั่วไป</option>
                  <option value="PRE_TEST">Pre-Test (ก่อนเรียน)</option>
                  <option value="POST_TEST">Post-Test (หลังเรียน)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passingScore">คะแนนผ่าน (%)</Label>
                <Input id="passingScore" name="passingScore" type="number" min={0} max={100} defaultValue={quiz.passingScore} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAttempts">จำนวนครั้งสูงสุด (0 = ไม่จำกัด)</Label>
                <Input id="maxAttempts" name="maxAttempts" type="number" min={0} defaultValue={quiz.maxAttempts} />
              </div>
            </div>
            <Button type="submit">บันทึก</Button>
          </form>

          {attemptCount === 0 && (
            <form action={deleteQuiz.bind(null, qId)} className="mt-4 pt-4 border-t">
              <Button type="submit" variant="destructive" size="sm">ลบแบบทดสอบ</Button>
            </form>
          )}
          {attemptCount > 0 && (
            <p className="mt-4 pt-4 border-t text-sm text-muted-foreground">
              ไม่สามารถลบได้ — มีนักเรียนทำแบบทดสอบนี้แล้ว {attemptCount} ครั้ง
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Lesson linking */}
      <Card>
        <CardHeader><CardTitle>เชื่อมกับบทเรียน</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {courseLessons.map((lesson) => {
            const linked = linkedLessonIds.has(lesson.id);
            return (
              <div key={lesson.id} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">{lesson.order}. {lesson.title}</span>
                {linked ? (
                  <form action={detachQuizFromLesson.bind(null, qId, lesson.id)}>
                    <Button type="submit" variant="outline" size="sm">ถอดออก</Button>
                  </form>
                ) : (
                  <form action={attachQuizToLesson.bind(null, qId, lesson.id)}>
                    <Button type="submit" size="sm">เชื่อม</Button>
                  </form>
                )}
              </div>
            );
          })}
          {courseLessons.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มีบทเรียนในหลักสูตรนี้</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>คำถาม ({quiz.questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(quiz.questions as any[]).map((q: any, qi: number) => (
            <div key={q.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <p className="font-medium text-sm flex-1">
                  ข้อ {qi + 1}: {q.questionText}
                  <span className="text-muted-foreground ml-2 font-normal">
                    ({q.points === 1 ? "1 คะแนน" : `${q.points} คะแนน`})
                  </span>
                </p>
                <form action={deleteQuestion.bind(null, q.id)}>
                  <button type="submit" className="text-destructive hover:underline text-xs shrink-0">ลบ</button>
                </form>
              </div>

              <div className="space-y-1 pl-4">
                {(q.choices as any[]).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className={c.isCorrect ? "text-green-600 font-medium" : ""}>
                      {c.isCorrect ? "✓ " : "  "}{c.choiceText}
                    </span>
                    <form action={deleteChoice.bind(null, c.id)}>
                      <button type="submit" className="text-muted-foreground hover:text-destructive text-xs">ลบ</button>
                    </form>
                  </div>
                ))}
              </div>

              <form action={addChoice.bind(null, q.id)} className="flex gap-2 pl-4">
                <Input name="choiceText" placeholder="เพิ่มตัวเลือก..." className="h-8 text-sm" required />
                <select name="isCorrect" className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="false">ผิด</option>
                  <option value="true">ถูก</option>
                </select>
                <Button type="submit" size="sm" variant="outline">เพิ่ม</Button>
              </form>
            </div>
          ))}

          {quiz.questions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              ยังไม่มีคำถาม — เพิ่มคำถามด้านล่าง
            </p>
          )}

          {/* Add question */}
          <form action={addQuestion.bind(null, qId)} className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">เพิ่มคำถามใหม่</p>
            <div className="space-y-2">
              <Label htmlFor="questionText">คำถาม *</Label>
              <textarea
                id="questionText"
                name="questionText"
                rows={2}
                required
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="ระบุคำถาม..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">คะแนน</Label>
              <Input id="points" name="points" type="number" min={0.5} step={0.5} defaultValue={1} className="w-32" />
            </div>
            <Button type="submit" size="sm">เพิ่มคำถาม</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
