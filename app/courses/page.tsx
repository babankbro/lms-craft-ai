import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { getCourseProgress } from "./actions";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; level?: string }>;
}) {
  const user = await requireAuth();
  const { q, category, level } = await searchParams;

  const courses = await prisma.course.findMany({
    where: {
      ...(canAuthor(user.role) ? {} : { isPublished: true }),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(category ? { category } : {}),
      ...(level ? { level: level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" } : {}),
    },
    include: {
      lessons: { select: { id: true } },
      enrollments: { where: { userId: user.id }, select: { id: true } },
      author: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const allCategories = await prisma.course.findMany({
    where: canAuthor(user.role) ? {} : { isPublished: true },
    select: { category: true },
    distinct: ["category"],
  }).then((rows) => rows.map((r) => r.category).filter(Boolean) as string[]);

  const levelLabels: Record<string, string> = {
    BEGINNER: "เริ่มต้น",
    INTERMEDIATE: "กลาง",
    ADVANCED: "สูง",
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">รายวิชาทั้งหมด</h1>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-center">
        <Input
          name="q"
          defaultValue={q || ""}
          placeholder="ค้นหาชื่อวิชา..."
          className="w-60"
        />
        {allCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link href="/courses">
              <Badge variant={!category ? "default" : "outline"} className="cursor-pointer">
                ทั้งหมด
              </Badge>
            </Link>
            {allCategories.map((cat) => (
              <Link key={cat} href={`/courses?category=${encodeURIComponent(cat)}${level ? `&level=${level}` : ""}${q ? `&q=${q}` : ""}` }>
                <Badge variant={category === cat ? "default" : "outline"} className="cursor-pointer">
                  {cat}
                </Badge>
              </Link>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((lv) => (
            <Link key={lv} href={`/courses?${category ? `category=${category}&` : ""}level=${lv}${q ? `&q=${q}` : ""}` }>
              <Badge variant={level === lv ? "default" : "outline"} className="cursor-pointer text-xs">
                {levelLabels[lv]}
              </Badge>
            </Link>
          ))}
        </div>
        <Button type="submit" size="sm">ค้นหา</Button>
      </form>

      {/* Course grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map(async (course) => {
          const enrolled = course.enrollments.length > 0;
          const progress = enrolled ? await getCourseProgress(user.id, course.id) : 0;

          return (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="block p-5 border rounded-lg hover:border-primary transition space-y-2"
            >
              <div className="flex justify-between items-start gap-2">
                <h2 className="text-base font-semibold leading-snug">{course.title}</h2>
                {enrolled ? (
                  <Badge variant={progress === 100 ? "default" : "secondary"} className="shrink-0">
                    {progress === 100 ? "เรียนจบ" : `${progress}%`}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">ยังไม่ลงทะเบียน</Badge>
                )}
              </div>
              {course.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
              )}
              <div className="flex flex-wrap gap-2 items-center">
                {course.category && <Badge variant="secondary" className="text-xs">{course.category}</Badge>}
                {course.level && <Badge variant="outline" className="text-xs">{levelLabels[course.level] || course.level}</Badge>}
                <span className="text-xs text-muted-foreground">{course.lessons.length} บทเรียน</span>
                {course.author && (
                  <span className="text-xs text-muted-foreground">โดย {course.author.fullName}</span>
                )}
              </div>
              {enrolled && <Progress value={progress} className="h-1.5" />}
            </Link>
          );
        })}
      </div>

      {courses.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          ไม่พบรายวิชาที่ตรงกับเงื่อนไขที่เลือก
        </p>
      )}
    </div>
  );
}
