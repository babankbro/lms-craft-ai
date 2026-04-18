import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export async function InstructorDashboard({ userId }: { userId: string }) {
  const courses = await prisma.course.findMany({
    where: { authorId: userId },
    include: {
      lessons: { select: { id: true } },
      enrollments: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalEnrollments = courses.reduce((sum, c) => sum + c.enrollments.length, 0);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">แดชบอร์ดผู้สอน</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>หลักสูตรทั้งหมด</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{courses.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>ผู้เรียนทั้งหมด</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalEnrollments}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>หลักสูตรที่เผยแพร่</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{courses.filter((c) => c.isPublished).length}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-6">หลักสูตรของฉัน</h2>
      <div className="space-y-2">
        {courses.map((course) => (
          <Card key={course.id}>
            <CardContent className="pt-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{course.title}</p>
                <p className="text-sm text-muted-foreground">
                  {course.lessons.length} บทเรียน · {course.enrollments.length} ผู้เรียน
                </p>
              </div>
              <Link
                href={`/admin/courses/${course.id}`}
                className="text-primary hover:underline text-sm"
              >
                จัดการ
              </Link>
            </CardContent>
          </Card>
        ))}
        {courses.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            ยังไม่มีหลักสูตร
          </p>
        )}
      </div>
    </div>
  );
}
