import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { WeightForm } from "./_components/weight-form";

export const dynamic = "force-dynamic";

const EXAMPLE_SCORES: Record<string, number> = {
  lessonQuizWeight: 72.5,
  sectionQuizWeight: 80,
  lessonAssignmentWeight: 65,
  courseAssignmentWeight: 90,
};

const LABELS: Record<string, string> = {
  lessonQuizWeight:        "แบบทดสอบหลังเรียน (ระดับบทเรียน)",
  sectionQuizWeight:       "แบบทดสอบหลังเรียน (ระดับหมวด)",
  lessonAssignmentWeight:  "งานมอบหมาย (ระดับบทเรียน)",
  courseAssignmentWeight:  "งานมอบหมาย (ระดับวิชา)",
};

export default async function ScoreConfigPage({
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
    select: { id: true, title: true, authorId: true },
  });
  if (!course) notFound();
  if (user.role !== "ADMIN" && course.authorId !== user.id) redirect("/teach");

  const config = await prisma.courseScoreConfig.upsert({
    where: { courseId },
    update: {},
    create: { courseId },
  });

  const weights = {
    lessonQuizWeight:        config.lessonQuizWeight,
    sectionQuizWeight:       config.sectionQuizWeight,
    lessonAssignmentWeight:  config.lessonAssignmentWeight,
    courseAssignmentWeight:  config.courseAssignmentWeight,
  };

  // Example calculation using sample scores × current saved weights
  const weightKeys = Object.keys(weights) as (keyof typeof weights)[];
  const activeComponents = weightKeys.filter((k) => weights[k] > 0);
  const totalActiveWeight = activeComponents.reduce((s, k) => s + weights[k], 0);
  const exampleFinal = totalActiveWeight > 0
    ? activeComponents.reduce((s, k) => s + EXAMPLE_SCORES[k] * weights[k], 0) / totalActiveWeight
    : null;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={`/teach/${courseId}`} className="text-sm text-muted-foreground hover:underline">
          ← กลับหน้าจัดการวิชา
        </Link>
        <h1 className="text-2xl font-bold mt-2">กำหนดน้ำหนักคะแนน</h1>
        <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>การตั้งค่าน้ำหนัก</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightForm courseId={courseId} initial={weights} />
        </CardContent>
      </Card>

      {/* Example calculation using current saved weights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ตัวอย่างการคำนวณ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            คะแนนตัวอย่าง (สมมติ) — แสดงผลลัพธ์จากน้ำหนักที่บันทึกแล้ว
          </p>
          <div className="space-y-1.5">
            {weightKeys.map((k) => {
              const w = weights[k];
              const s = EXAMPLE_SCORES[k];
              const contrib = w > 0 ? (s * w) / (totalActiveWeight || 100) : 0;
              return (
                <div key={k} className="flex justify-between text-xs">
                  <span className={w === 0 ? "text-muted-foreground line-through" : ""}>
                    {LABELS[k]}
                  </span>
                  <span className={w === 0 ? "text-muted-foreground" : ""}>
                    {w === 0
                      ? "— (ไม่นับ)"
                      : `${s}% × ${w}% = ${contrib.toFixed(2)} คะแนน`}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between text-sm font-semibold">
            <span>คะแนนรวม</span>
            <span>
              {exampleFinal != null ? `${exampleFinal.toFixed(2)} / 100` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
