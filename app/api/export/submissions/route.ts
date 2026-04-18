/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  if (!["ADMIN", "MENTOR", "INSTRUCTOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: Record<string, unknown> =
    role === "MENTOR"
      ? { student: { mentorId: userId } }
      : role === "INSTRUCTOR"
      ? { assignment: { lesson: { course: { authorId: userId } } } }
      : {};

  const submissions = await prisma.submission.findMany({
    where,
    include: {
      student: { select: { fullName: true, email: true, groupName: true } },
      assignment: { select: { title: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const date = new Date().toISOString().slice(0, 10);
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";

  if (format === "csv") {
    const header = "id,student,email,groupName,assignment,status,score,maxScore,reviewCycle,submittedAt";
    const rows = submissions.map((s) =>
      [
        s.id,
        `"${s.student.fullName}"`,
        s.student.email,
        s.student.groupName ?? "",
        `"${s.assignment.title}"`,
        s.status,
        s.score ?? "",
        s.maxScore ?? "",
        (s as any).reviewCycle ?? 1,
        s.submittedAt?.toISOString() ?? "",
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="submissions-${date}.csv"`,
      },
    });
  }

  return NextResponse.json(submissions);
}
