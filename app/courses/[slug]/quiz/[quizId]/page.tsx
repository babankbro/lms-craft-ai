import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import Link from "next/link";
import { QuizTaker } from "./_components/quiz-taker";
import { canAccessPostTest } from "@/lib/course-gates";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string; quizId: string }>;
}) {
  const user = await requireAuth();
  const { slug, quizId } = await params;
  const qId = parseInt(quizId);

  const quiz = await prisma.quiz.findUnique({
    where: { id: qId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { choices: true },
      },
      course: { select: { slug: true, title: true } },
    },
  });

  if (!quiz || quiz.course?.slug !== slug) notFound();

  // Post-Test gate: student must have completed all sections before taking it
  let postTestBlocked = false;
  let isCoursePostTest = false;
  if (quiz.courseId) {
    const courseForGate = await prisma.course.findUnique({
      where: { id: quiz.courseId },
      select: { postTestQuizId: true },
    });
    if (courseForGate?.postTestQuizId === qId) {
      isCoursePostTest = true;
      if (user.role === "STUDENT") {
        const allowed = await canAccessPostTest(user.id, quiz.courseId);
        if (!allowed) postTestBlocked = true;
      }
    }
  }

  const attemptCount = await prisma.quizAttempt.count({
    where: { quizId: qId, studentId: user.id },
  });

  const maxReached = quiz.maxAttempts > 0 && attemptCount >= quiz.maxAttempts;

  const lastAttempt = await prisma.quizAttempt.findFirst({
    where: { quizId: qId, studentId: user.id, isSubmitted: true },
    orderBy: { attemptNo: "desc" },
    include: {
      answers: { include: { choice: true } },
    },
  });

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/courses/${slug}`} className="text-muted-foreground hover:underline text-sm">
          {quiz.course?.title}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">{quiz.title}</h1>
        <Badge variant="outline">{quiz.type}</Badge>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{quiz.questions.length} คำถาม</span>
        <span>คะแนนผ่าน: {quiz.passingScore}%</span>
        <span>
          ทำแล้ว: {attemptCount}{quiz.maxAttempts > 0 ? `/${quiz.maxAttempts}` : ""} ครั้ง
        </span>
      </div>

      {postTestBlocked ? (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-semibold">ยังไม่สามารถทำแบบทดสอบหลังเรียนได้</p>
            <p className="text-sm text-muted-foreground">กรุณาเรียนให้ครบทุกหัวข้อและผ่านแบบทดสอบก่อน จึงจะสามารถทำแบบทดสอบหลังเรียนได้</p>
            <Link href={`/courses/${slug}`} className="text-primary hover:underline text-sm">
              กลับไปหน้าหลักสูตร
            </Link>
          </CardContent>
        </Card>
      ) : maxReached ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">ครบจำนวนครั้งที่อนุญาตแล้ว ({quiz.maxAttempts} ครั้ง)</p>
            {lastAttempt && (
              <p className="mt-2 font-medium">
                คะแนนสุดท้าย: {lastAttempt.percentage?.toFixed(1)}%{" "}
                {lastAttempt.isPassed ? (
                  <span className="text-green-600">ผ่าน</span>
                ) : (
                  <span className="text-red-600">ไม่ผ่าน</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <QuizTaker
          quiz={{
            id: quiz.id,
            title: quiz.title,
            passingScore: quiz.passingScore,
            questions: quiz.questions.map((q) => ({
              id: q.id,
              questionText: q.questionText,
              points: q.points,
              choices: q.choices.map((c) => ({ id: c.id, choiceText: c.choiceText })),
            })),
          }}
          previousAttempt={
            lastAttempt
              ? {
                  score: lastAttempt.score ?? 0,
                  totalPoints: lastAttempt.totalPoints ?? 0,
                  percentage: lastAttempt.percentage ?? 0,
                  isPassed: lastAttempt.isPassed ?? false,
                  answerMap: Object.fromEntries(
                    lastAttempt.answers.map((a) => [a.questionId, a.choiceId])
                  ),
                }
              : null
          }
          isCoursePostTest={isCoursePostTest}
        />
      )}
    </div>
  );
}
