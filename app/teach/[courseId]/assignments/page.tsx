import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteAssignment } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CourseAssignmentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireAuth();
  if (!canAuthor(user.role)) redirect("/dashboard");

  const { courseId: courseIdStr } = await params;
  const courseId = parseInt(courseIdStr);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          assignments: {
            include: { _count: { select: { submissions: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!course) notFound();
  if (user.role !== "ADMIN" && course.authorId !== user.id) redirect("/teach");

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href={`/teach/${courseId}`} className="text-sm text-muted-foreground hover:underline">
            ← กลับ
          </Link>
          <h1 className="text-2xl font-bold mt-1">งานมอบหมาย — {course.title}</h1>
        </div>
      </div>

      {course.lessons.map((lesson) => (
        <Card key={lesson.id}>
          <CardHeader>
            <CardTitle className="text-base">
              บทเรียน {lesson.order}: {lesson.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {a._count.submissions} การส่งงาน
                    {a.dueDate && ` · กำหนด ${new Date(a.dueDate).toLocaleDateString("th-TH")}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/teach/${courseId}/assignments/${a.id}`}>
                    <Button variant="outline" size="sm">แก้ไข</Button>
                  </Link>
                  <form action={deleteAssignment.bind(null, a.id, courseId, false)}>
                    <Button type="submit" variant="ghost" size="sm"
                      disabled={a._count.submissions > 0}>
                      ลบ
                    </Button>
                  </form>
                </div>
              </div>
            ))}
            {lesson.assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">ยังไม่มีงานมอบหมาย</p>
            )}
            <Link href={`/teach/${courseId}/assignments/new?lessonId=${lesson.id}`}>
              <Button variant="outline" size="sm" className="mt-2">+ เพิ่มงานมอบหมาย</Button>
            </Link>
          </CardContent>
        </Card>
      ))}

      {course.lessons.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            ยังไม่มีบทเรียน กรุณาเพิ่มบทเรียนก่อน
          </CardContent>
        </Card>
      )}
    </div>
  );
}
