import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function QuizEditorPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const { courseId, quizId } = await params;
  const cId = parseInt(courseId);
  const qId = parseInt(quizId);

  const quiz = await prisma.quiz.findUnique({
    where: { id: qId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { choices: true },
      },
      lessonQuizzes: { include: { lesson: { select: { id: true, title: true } } } },
      course: { select: { id: true, title: true, authorId: true } },
    },
  });

  if (!quiz || quiz.courseId !== cId) notFound();
  if (quiz.course?.authorId !== user.id && user.role !== "ADMIN") redirect("/teach");

  const courseLessons = await prisma.lesson.findMany({
    where: { courseId: cId },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });

  const linkedLessonIds = new Set(quiz.lessonQuizzes.map((lq) => lq.lessonId));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/teach/${cId}`} className="text-muted-foreground hover:underline text-sm">
          {quiz.course?.title}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">แก้ไขแบบทดสอบ: {quiz.title}</h1>
        <Badge variant="outline">{quiz.type}</Badge>
      </div>

      {/* Quiz Settings */}
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
                <Select name="type" defaultValue={quiz.type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRE_TEST">Pre-test</SelectItem>
                    <SelectItem value="POST_TEST">Post-test</SelectItem>
                    <SelectItem value="QUIZ">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passingScore">คะแนนผ่าน (%)</Label>
                <Input id="passingScore" name="passingScore" type="number" min={0} max={100} defaultValue={quiz.passingScore} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAttempts">จำนวนครั้งที่ทำได้ (0 = ไม่จำกัด)</Label>
                <Input id="maxAttempts" name="maxAttempts" type="number" min={0} defaultValue={quiz.maxAttempts} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">บันทึก</Button>
            </div>
          </form>
          <form action={deleteQuiz.bind(null, qId)} className="mt-4 pt-4 border-t">
            <Button type="submit" variant="destructive" size="sm">ลบแบบทดสอบ</Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Link to lessons */}
      <Card>
        <CardHeader><CardTitle>เชื่อมกับบทเรียน</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {courseLessons.map((lesson) => {
            const linked = linkedLessonIds.has(lesson.id);
            return (
              <div key={lesson.id} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">{lesson.title}</span>
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
          <div className="flex justify-between items-center">
            <CardTitle>คำถาม ({quiz.questions.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {quiz.questions.map((q, qi) => (
            <div key={q.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm">
                  ข้อ {qi + 1}: {q.questionText}
                  <span className="text-muted-foreground ml-2">({q.points} คะแนน)</span>
                </p>
                <form action={deleteQuestion.bind(null, q.id)}>
                  <button type="submit" className="text-destructive hover:underline text-xs">ลบ</button>
                </form>
              </div>

              <div className="space-y-1 pl-4">
                {q.choices.map((c) => (
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

              {/* Add choice */}
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
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">เพิ่มคำถามใหม่</p>
            <form action={addQuestion.bind(null, qId)} className="space-y-2">
              <Input name="questionText" placeholder="คำถาม..." required />
              <div className="flex gap-2">
                <Input name="points" type="number" step="0.5" min={0.5} defaultValue={1} className="w-24" />
                <Label className="self-center text-sm text-muted-foreground">คะแนน</Label>
                <Button type="submit" size="sm">เพิ่มคำถาม</Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
