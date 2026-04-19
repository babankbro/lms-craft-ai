"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveScoreConfig } from "../actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

const FIELDS = [
  { key: "lessonQuizWeight",        label: "แบบทดสอบหลังเรียน (ระดับบทเรียน)" },
  { key: "sectionQuizWeight",       label: "แบบทดสอบหลังเรียน (ระดับหมวด)" },
  { key: "lessonAssignmentWeight",  label: "งานมอบหมาย (ระดับบทเรียน)" },
  { key: "courseAssignmentWeight",  label: "งานมอบหมาย (ระดับวิชา)" },
] as const;

type FieldKey = typeof FIELDS[number]["key"];

interface Props {
  courseId: number;
  initial: Record<FieldKey, number>;
}

export function WeightForm({ courseId, initial }: Props) {
  const [weights, setWeights] = useState<Record<FieldKey, string>>({
    lessonQuizWeight:       String(initial.lessonQuizWeight),
    sectionQuizWeight:      String(initial.sectionQuizWeight),
    lessonAssignmentWeight: String(initial.lessonAssignmentWeight),
    courseAssignmentWeight: String(initial.courseAssignmentWeight),
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = FIELDS.reduce((sum, f) => sum + (parseFloat(weights[f.key]) || 0), 0);
  const isValid = Math.abs(total - 100) <= 0.01;

  function handleChange(key: FieldKey, value: string) {
    setSaved(false);
    setError("");
    setWeights((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setSaved(false);
    setError("");
    setWeights({ lessonQuizWeight: "25", sectionQuizWeight: "25", lessonAssignmentWeight: "25", courseAssignmentWeight: "25" });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await saveScoreConfig(courseId, fd);
        setSaved(true);
        setError("");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-3">
            <Label className="flex-1 text-sm">{f.label}</Label>
            <div className="flex items-center gap-1.5 w-32">
              <Input
                name={f.key}
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={weights[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="h-8 text-sm text-right"
              />
              <span className="text-sm text-muted-foreground shrink-0">%</span>
            </div>
          </div>
        ))}

        {/* Sum row */}
        <div className="flex items-center gap-3 border-t pt-3">
          <span className="flex-1 text-sm font-semibold">รวม</span>
          <div className="flex items-center gap-1.5 w-32">
            <span
              className={`w-full text-right text-sm font-semibold ${
                isValid ? "text-green-600" : "text-destructive"
              }`}
            >
              {total.toFixed(total % 1 === 0 ? 0 : 1)}
            </span>
            <span className="text-sm text-muted-foreground shrink-0">%</span>
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
          </div>
        </div>
      </div>

      {!isValid && (
        <p className="text-xs text-destructive">
          น้ำหนักรวมต้องเท่ากับ 100% (ปัจจุบัน {total.toFixed(1)}%)
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {saved && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          บันทึกสำเร็จ
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!isValid || isPending}>
          {isPending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleReset}>
          รีเซ็ตเป็น 25/25/25/25
        </Button>
      </div>
    </form>
  );
}
