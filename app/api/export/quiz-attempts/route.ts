import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { isSubmitted: true },
    include: {
      student: { select: { email: true, fullName: true } },
      quiz: { select: { id: true, title: true, type: true, courseId: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  // Build a pre/post score lookup: studentId+courseId -> { pre_score, post_score }
  type ScorePair = { pre: number | null; post: number | null };
  const scorePairMap = new Map<string, ScorePair>();

  for (const a of attempts) {
    const courseId = a.quiz.courseId;
    if (!courseId) continue;
    if (a.quiz.type !== "PRE_TEST" && a.quiz.type !== "POST_TEST") continue;
    const key = `${a.studentId}__${courseId}`;
    const pair = scorePairMap.get(key) ?? { pre: null, post: null };
    const pct = a.percentage ?? null;
    if (a.quiz.type === "PRE_TEST") {
      if (pair.pre === null || (pct !== null && pct > pair.pre)) pair.pre = pct;
    } else {
      if (pair.post === null || (pct !== null && pct > pair.post)) pair.post = pct;
    }
    scorePairMap.set(key, pair);
  }

  const date = new Date().toISOString().slice(0, 10);
  const header = "attemptId,studentEmail,studentName,quizTitle,quizType,attemptNo,score,totalPoints,percentage,isPassed,submittedAt,pre_score,post_score,delta";
  const rows = attempts.map((a) => {
    const courseId = a.quiz.courseId;
    const pair = courseId ? (scorePairMap.get(`${a.studentId}__${courseId}`) ?? null) : null;
    const preScore = pair?.pre != null ? pair.pre.toFixed(1) : "";
    const postScore = pair?.post != null ? pair.post.toFixed(1) : "";
    const delta =
      pair?.pre != null && pair?.post != null
        ? (pair.post - pair.pre).toFixed(1)
        : "";
    return [
      a.id,
      a.student.email,
      `"${a.student.fullName}"`,
      `"${a.quiz.title}"`,
      a.quiz.type,
      a.attemptNo,
      a.score ?? "",
      a.totalPoints ?? "",
      a.percentage != null ? a.percentage.toFixed(1) : "",
      a.isPassed ?? "",
      a.submittedAt?.toISOString() ?? "",
      preScore,
      postScore,
      delta,
    ].join(",");
  });
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="quiz-attempts-${date}.csv"`,
    },
  });
}
