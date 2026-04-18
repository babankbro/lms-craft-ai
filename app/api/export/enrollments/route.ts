import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrollments = await prisma.enrollment.findMany({
    include: {
      user: { select: { email: true, fullName: true } },
      course: { select: { title: true } },
    },
    where: { status: "APPROVED" },
    orderBy: { requestedAt: "desc" },
  });

  const date = new Date().toISOString().slice(0, 10);
  const header = "userId,email,fullName,courseId,courseTitle,requestedAt";
  const rows = enrollments.map((e) =>
    [
      e.userId,
      e.user.email,
      `"${e.user.fullName}"`,
      e.courseId,
      `"${e.course.title}"`,
      e.requestedAt.toISOString(),
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="enrollments-${date}.csv"`,
    },
  });
}
