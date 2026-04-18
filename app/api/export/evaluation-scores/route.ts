import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  if (!["ADMIN", "MENTOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where =
    role === "MENTOR" ? { evaluatee: { mentorId: userId } } : {};

  const evaluations = await prisma.evaluation.findMany({
    where,
    include: {
      evaluator: { select: { fullName: true, email: true } },
      evaluatee: { select: { fullName: true, email: true } },
      round: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const selfEvals = await prisma.selfEvaluation.findMany({
    where: role === "MENTOR" ? { user: { mentorId: userId } } : {},
    include: {
      user: { select: { fullName: true, email: true } },
      round: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const date = new Date().toISOString().slice(0, 10);
  const header = "type,round,evaluatorEmail,evaluatorName,evaluateeEmail,evaluateeName,score,feedback";
  const evalRows = evaluations.map((e) =>
    [
      "EVALUATION",
      `"${e.round.name}"`,
      e.evaluator.email,
      `"${e.evaluator.fullName}"`,
      e.evaluatee.email,
      `"${e.evaluatee.fullName}"`,
      e.score,
      `"${(e.feedback ?? "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  const selfRows = selfEvals.map((s) =>
    [
      "SELF_EVAL",
      `"${s.round.name}"`,
      s.user.email,
      `"${s.user.fullName}"`,
      s.user.email,
      `"${s.user.fullName}"`,
      s.score,
      `"${(s.reflection ?? "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  const csv = [header, ...evalRows, ...selfRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="evaluation-scores-${date}.csv"`,
    },
  });
}
