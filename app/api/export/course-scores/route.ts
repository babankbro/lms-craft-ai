import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentCourseScore } from "@/lib/course-score";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["ADMIN", "INSTRUCTOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courseIdStr = searchParams.get("courseId");
  if (!courseIdStr) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const courseId = parseInt(courseIdStr);
  if (isNaN(courseId)) return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });

  // Verify instructor owns this course
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true, authorId: true },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (role === "INSTRUCTOR" && course.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "APPROVED" },
    include: { user: { select: { id: true, fullName: true, email: true, groupName: true } } },
    orderBy: { user: { fullName: "asc" } },
  });

  const rows = await Promise.all(
    enrollments.map(async (e) => {
      const bd = await getStudentCourseScore(e.user.id, courseId);
      return { user: e.user, bd };
    })
  );

  const header =
    "full_name,email,group," +
    "lesson_quiz_score,section_quiz_score,lesson_assignment_score,course_assignment_score," +
    "final_score";

  const csvRows = rows.map(({ user: u, bd }) =>
    [
      `"${u.fullName.replace(/"/g, '""')}"`,
      u.email,
      u.groupName ?? "",
      bd.lessonQuiz.score?.toFixed(2) ?? "",
      bd.sectionQuiz.score?.toFixed(2) ?? "",
      bd.lessonAssignment.score?.toFixed(2) ?? "",
      bd.courseAssignment.score?.toFixed(2) ?? "",
      bd.finalScore?.toFixed(2) ?? "",
    ].join(",")
  );

  const csv = [header, ...csvRows].join("\n");
  const date = new Date().toISOString().slice(0, 10);
  const slug = course.title.toLowerCase().replace(/\s+/g, "-").slice(0, 30);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scores-${slug}-${date}.csv"`,
    },
  });
}
