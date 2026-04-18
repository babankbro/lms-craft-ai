"use client";

import { useState } from "react";
import { startQuizAttempt, submitQuizAttempt } from "@/app/courses/quiz-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Award } from "lucide-react";
import type { QuizResult } from "@/lib/scoring";

type QuizQuestion = {
  id: number;
  questionText: string;
  points: number;
  choices: { id: number; choiceText: string }[];
};

type QuizData = {
  id: number;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
};

type PreviousAttempt = {
  score: number;
  totalPoints: number;
  percentage: number;
  isPassed: boolean;
  answerMap: Record<number, number>;
} | null;

export function QuizTaker({
  quiz,
  previousAttempt,
  isCoursePostTest = false,
}: {
  quiz: QuizData;
  previousAttempt: PreviousAttempt;
  isCoursePostTest?: boolean;
}) {
  const [phase, setPhase] = useState<"start" | "taking" | "result">(
    previousAttempt ? "result" : "start"
  );
  const [answers, setAnswers] = useState<Record<number, number>>(
    previousAttempt?.answerMap ?? {}
  );
  const [result, setResult] = useState<QuizResult | null>(
    previousAttempt
      ? {
          score: previousAttempt.score,
          totalPoints: previousAttempt.totalPoints,
          percentage: previousAttempt.percentage,
          isPassed: previousAttempt.isPassed,
          details: [],
        }
      : null
  );
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const id = await startQuizAttempt(quiz.id);
      setAttemptId(id);
      setAnswers({});
      setPhase("taking");
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!attemptId) return;
    const unanswered = quiz.questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      setError(`กรุณาตอบให้ครบทุกข้อ (ยังขาด ${unanswered.length} ข้อ)`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const answerList = Object.entries(answers).map(([qId, cId]) => ({
        questionId: Number(qId),
        choiceId: cId,
      }));
      const res = await submitQuizAttempt(attemptId, answerList);
      setResult(res);
      setPhase("result");
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }

  if (phase === "start") {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <p className="text-muted-foreground">
            {quiz.questions.length} ข้อ · ผ่านเมื่อได้ {quiz.passingScore}%
          </p>
          {previousAttempt && (
            <p className="text-sm text-muted-foreground">
              ครั้งก่อน: {previousAttempt.percentage.toFixed(1)}%{" "}
              <span className={previousAttempt.isPassed ? "text-green-600" : "text-red-600"}>
                {previousAttempt.isPassed ? "ผ่าน" : "ไม่ผ่าน"}
              </span>
            </p>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button onClick={handleStart} disabled={loading} size="lg">
            {loading ? "กำลังเริ่ม..." : previousAttempt ? "ทำอีกครั้ง" : "เริ่มทำแบบทดสอบ"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>ผลการทดสอบ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <p className="text-4xl font-bold">{result.percentage.toFixed(1)}%</p>
              <Badge
                variant={result.isPassed ? "default" : "destructive"}
                className="text-base px-3 py-1"
              >
                {result.isPassed ? "ผ่าน" : "ไม่ผ่าน"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              คะแนน: {result.score}/{result.totalPoints} · เกณฑ์ผ่าน: {quiz.passingScore}%
            </p>
            {result.details.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="font-medium text-sm mb-2">รายละเอียดแต่ละข้อ:</p>
                {result.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span>{d.isCorrect ? "✅" : "❌"}</span>
                    <span>ข้อ {i + 1}: {d.earnedPoints} คะแนน</span>
                  </div>
                ))}
              </div>
            )}
            {isCoursePostTest && result.isPassed && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-4 py-3">
                <Award className="h-5 w-5 shrink-0 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">ยินดีด้วย! คุณผ่านหลักสูตรเรียบร้อยแล้ว</p>
                  <p className="text-xs text-green-700 dark:text-green-400">เกียรติบัตรของคุณถูกออกให้แล้ว</p>
                </div>
                <Button asChild size="sm" variant="default" className="shrink-0 bg-green-600 hover:bg-green-700">
                  <Link href="/certificates">ดูเกียรติบัตร</Link>
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setPhase("start")}
              className="mt-2"
            >
              ทำอีกครั้ง
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Taking phase
  return (
    <div className="space-y-6">
      {quiz.questions.map((q, idx) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="text-base">
              ข้อ {idx + 1}: {q.questionText}
              <span className="text-muted-foreground font-normal ml-2 text-sm">
                ({q.points} คะแนน)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {q.choices.map((c) => (
              <label
                key={c.id}
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  answers[q.id] === c.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  value={c.id}
                  checked={answers[q.id] === c.id}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                  className="accent-primary"
                />
                <span className="text-sm">{c.choiceText}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 items-center">
        <Button onClick={handleSubmit} disabled={loading} size="lg">
          {loading ? "กำลังส่ง..." : "ส่งคำตอบ"}
        </Button>
        <span className="text-sm text-muted-foreground">
          ตอบแล้ว {Object.keys(answers).length}/{quiz.questions.length} ข้อ
        </span>
      </div>
    </div>
  );
}
