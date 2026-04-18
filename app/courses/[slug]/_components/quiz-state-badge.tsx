import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PauseCircle, FlaskConical, CheckCircle2, RotateCcw } from "lucide-react";

interface Props {
  quizId: number;
  title: string;
  placement: "BEFORE" | "AFTER";
  attempt?: { isPassed: boolean | null; isSubmitted: boolean } | undefined;
  href: string;
}

export function QuizStateBadge({ quizId: _quizId, title, placement, attempt, href }: Props) {
  let icon = <PauseCircle className="w-3 h-3" />;
  let label = placement === "BEFORE" ? "ก่อนเรียน" : "หลังเรียน";
  let variant: "default" | "secondary" | "outline" | "destructive" = "outline";

  if (!attempt) {
    icon = <PauseCircle className="w-3 h-3" />;
    variant = "outline";
  } else if (!attempt.isSubmitted) {
    icon = <FlaskConical className="w-3 h-3" />;
    label = "กำลังทำ";
    variant = "secondary";
  } else if (attempt.isPassed) {
    icon = <CheckCircle2 className="w-3 h-3" />;
    label = "ผ่านแล้ว";
    variant = "default";
  } else {
    icon = <RotateCcw className="w-3 h-3" />;
    label = "ทำซ้ำ";
    variant = "destructive";
  }

  return (
    <Link href={href}>
      <Badge variant={variant} className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80">
        {icon}
        <span>{title.length > 20 ? title.slice(0, 20) + "…" : title}</span>
        <span className="opacity-60">({label})</span>
      </Badge>
    </Link>
  );
}
