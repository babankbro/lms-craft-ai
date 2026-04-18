"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ClipboardList, Lock } from "lucide-react";

export type QuizPassStatus = {
  attempted: boolean;
  isPassed: boolean;
  percentage: number | null;
};

interface QuizBannerProps {
  quizId: number;
  title: string;
  type: string;
  passingScore: number;
  courseSlug: string;
  passStatus: QuizPassStatus;
  isGate?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  PRE_TEST: "แบบทดสอบก่อนเรียน",
  POST_TEST: "แบบทดสอบหลังเรียน",
  QUIZ: "แบบทดสอบ",
};

export function QuizBanner({
  quizId,
  title,
  type,
  passingScore,
  courseSlug,
  passStatus,
  isGate,
}: QuizBannerProps) {
  const typeLabel = TYPE_LABEL[type] ?? "แบบทดสอบ";
  const borderColor = passStatus.isPassed
    ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
    : passStatus.attempted
    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
    : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30";

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 ${borderColor}`}>
      <div className="flex items-center gap-3 min-w-0">
        <ClipboardList className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {typeLabel}
            </span>
            {isGate && (
              <Badge variant="outline" className="text-xs gap-1">
                <Lock className="h-3 w-3" />
                เงื่อนไขผ่านหัวข้อ
              </Badge>
            )}
          </div>
          <p className="font-medium text-sm truncate">{title}</p>
          <p className="text-xs text-muted-foreground">เกณฑ์ผ่าน {passingScore}%</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {passStatus.attempted && (
          <div className="flex items-center gap-1.5 text-sm">
            {passStatus.isPassed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className={passStatus.isPassed ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
              {passStatus.percentage?.toFixed(0)}%
            </span>
          </div>
        )}
        <Button asChild size="sm" variant={passStatus.isPassed ? "outline" : "default"}>
          <Link href={`/courses/${courseSlug}/quiz/${quizId}`}>
            {passStatus.isPassed ? "ทำอีกครั้ง" : passStatus.attempted ? "ลองใหม่" : "เริ่มทำ"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
