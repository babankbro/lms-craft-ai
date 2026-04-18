import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import {
  updateQuiz,
  deleteQuiz,
  addQuestion,
  deleteQuestion,
  addChoice,
  deleteChoice,
} from "@/app/teach/actions";
import { linkQuizTarget } from "@/app/teach/[courseId]/quizzes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      sectionQuizzes: { include: { section: { select: { id: true, title: true } } } },
      course: { select: { id: true, title: true, authorId: true } },
    },
  });

  if (!quiz || quiz.courseId !== cId) notFound();
  if (quiz.course?.authorId !== user.id && user.role !== "ADMIN") redirect("/teach");

  const [courseLessons, courseSections] = await Promise.all([
    prisma.lesson.findMany({
      where: { courseId: cId },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true },
    }),
    prisma.courseSection.findMany({
      where: { courseId: cId },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  // Determine current single link (lesson takes priority if both exist somehow)
  const linkedLesson = quiz.lessonQuizzes[0]?.lesson ?? null;
  const linkedSection = quiz.sectionQuizzes[0]?.section ?? null;
  const currentTargetValue = linkedLesson
    ? `lesson:${linkedLesson.id}`
    : linkedSection
    ? `section:${linkedSection.id}`
    : "none";
  const currentTargetLabel = linkedLesson
    ? linkedLesson.title
    : linkedSection
    ? linkedSection.title
    : "ยังไม่เชื่อม";

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
                <select
                  id="type"
                  name="type"
                  defaultValue={quiz.type}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PRE_TEST">Pre-test</option>
                  <option value="POST_TEST">Post-test</option>
                  <option value="QUIZ">Quiz</option>
                </select>
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

      {/* Link to lesson / section */}
      <Card>
        <CardHeader><CardTitle>เชื่อมกับบทเรียน / หมวด</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            ปัจจุบัน: <span className="font-medium text-foreground">{currentTargetLabel}</span>
          </p>
          <form
            action={linkQuizTarget.bind(null, qId, cId)}
            className="flex items-center gap-3"
          >
            <select
              name="target"
              defaultValue={currentTargetValue}
              onChange={undefined}
              className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="none">ไม่เชื่อม</option>
              {courseLessons.length > 0 && (
                <optgroup label="บทเรียน">
                  {courseLessons.map((l) => (
                    <option key={l.id} value={`lesson:${l.id}`}>
                      {l.order}. {l.title}
                    </option>
                  ))}
                </optgroup>
              )}
              {courseSections.length > 0 && (
                <optgroup label="หมวด">
                  {courseSections.map((s) => (
                    <option key={s.id} value={`section:${s.id}`}>
                      {s.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <Button type="submit" size="sm">บันทึก</Button>
          </form>
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
