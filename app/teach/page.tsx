import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeachPage() {
  const user = await requireRole("INSTRUCTOR", "ADMIN");

  const courses = await prisma.course.findMany({
    where: user.role === "ADMIN" ? {} : { authorId: user.id },
    include: {
      author: { select: { fullName: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {user.role === "ADMIN" ? "หลักสูตรทั้งหมด" : "หลักสูตรของฉัน"}
        </h1>
        <Link href="/teach/new">
          <Button>+ สร้างหลักสูตรใหม่</Button>
        </Link>
      </div>

      {courses.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border rounded-lg">
          <p className="text-lg">ยังไม่มีหลักสูตร</p>
          <p className="text-sm mt-1">เริ่มต้นด้วยการสร้างหลักสูตรแรกของคุณ</p>
          <Link href="/teach/new" className="mt-4 inline-block">
            <Button variant="outline" className="mt-4">สร้างหลักสูตร</Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4">
        {courses.map((course) => (
          <Card key={course.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/teach/${course.id}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {course.title}
                    </Link>
                    <Badge variant={course.isPublished ? "default" : "outline"}>
                      {course.isPublished ? "เผยแพร่" : "ร่าง"}
                    </Badge>
                    {course.category && (
                      <Badge variant="secondary">{course.category}</Badge>
                    )}
                    {course.level && (
                      <Badge variant="secondary">{course.level}</Badge>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{course._count.lessons} บทเรียน</span>
                    <span>{course._count.enrollments} ผู้เรียน</span>
                    {user.role === "ADMIN" && course.author && (
                      <span>โดย {course.author.fullName}</span>
                    )}
                  </div>
                </div>
                <Link href={`/teach/${course.id}`}>
                  <Button variant="outline" size="sm">จัดการ</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
