import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const courses = await prisma.course.findMany({
    include: {
      _count: { select: { enrollments: true, certificates: true } },
    },
    orderBy: { title: "asc" },
  });

  const date = new Date().toISOString().slice(0, 10);
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";

  const rows = courses.map((c) => ({
    id: c.id,
    title: c.title,
    enrolled: c._count.enrollments,
    completed: c._count.certificates,
    passRate:
      c._count.enrollments > 0
        ? Math.round((c._count.certificates / c._count.enrollments) * 1000) / 10
        : 0,
  }));

  if (format === "csv") {
    const header = "id,title,enrolled,completed,passRate%";
    const csvRows = rows.map((r) =>
      [r.id, `"${r.title}"`, r.enrolled, r.completed, r.passRate].join(",")
    );
    const csv = [header, ...csvRows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="completion-${date}.csv"`,
      },
    });
  }

  return NextResponse.json(rows);
}
