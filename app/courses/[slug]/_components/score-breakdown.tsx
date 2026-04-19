import { getStudentCourseScore } from "@/lib/course-score";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const LABELS = {
  lessonQuiz:       "ทดสอบบทเรียน",
  sectionQuiz:      "ทดสอบหมวด",
  lessonAssignment: "งานบทเรียน",
  courseAssignment: "งานวิชา",
} as const;

type Key = keyof typeof LABELS;

function ComponentRow({
  label,
  score,
  itemCount,
  weight,
}: {
  label: string;
  score: number | null;
  itemCount: number;
  weight: number;
}) {
  const barValue = score ?? 0;

  let detail: string;
  if (weight === 0) {
    detail = "(ไม่นับ)";
  } else if (itemCount === 0) {
    detail = "ยังไม่มีรายการ";
  } else if (score === null) {
    detail = `0/${itemCount} รายการ`;
  } else {
    detail = `${score.toFixed(1)}% (${itemCount} รายการ)`;
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground text-xs">
          {weight > 0 ? `น้ำหนัก ${weight}%` : ""}
          {weight > 0 && score !== null
            ? ` · ได้ ${((score * weight) / 100).toFixed(1)} คะแนน`
            : ""}
        </span>
      </div>
      <Progress value={weight === 0 ? 0 : barValue} className="h-2" />
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export async function ScoreBreakdown({
  userId,
  courseId,
}: {
  userId: string;
  courseId: number;
}) {
  const bd = await getStudentCourseScore(userId, courseId);

  const totalWeight =
    bd.lessonQuiz.weight +
    bd.sectionQuiz.weight +
    bd.lessonAssignment.weight +
    bd.courseAssignment.weight;

  if (!bd.weightsConfigured || totalWeight === 0) return null;

  const keys: Key[] = ["lessonQuiz", "sectionQuiz", "lessonAssignment", "courseAssignment"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">สรุปคะแนน</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.map((k) => (
          <ComponentRow
            key={k}
            label={LABELS[k]}
            score={bd[k].score}
            itemCount={bd[k].itemCount}
            weight={bd[k].weight}
          />
        ))}
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">คะแนนรวม</span>
          <span className="text-lg font-bold">
            {bd.finalScore != null ? `${bd.finalScore.toFixed(2)} / 100` : "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
