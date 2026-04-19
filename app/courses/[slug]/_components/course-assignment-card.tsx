import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Clock } from "lucide-react";

interface Props {
  assignment: {
    id: number;
    title: string;
    dueDate: Date | null;
    description: string | null;
  };
  submission: { status: string } | null;
  courseSlug: string;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  SUBMITTED: "ส่งแล้ว",
  UNDER_REVIEW: "กำลังตรวจ",
  REVISION_REQUESTED: "แก้ไข",
  APPROVED: "ผ่านแล้ว ✓",
  REJECTED: "ไม่ผ่าน",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  SUBMITTED: "secondary",
  UNDER_REVIEW: "default",
  REVISION_REQUESTED: "destructive",
  APPROVED: "default",
  REJECTED: "destructive",
};

function getCTALabel(status: string | null): string {
  if (!status) return "เริ่มงาน";
  if (status === "DRAFT") return "ต่องาน";
  if (status === "REVISION_REQUESTED") return "แก้ไข";
  return "ดูงาน";
}

export function CourseAssignmentCard({ assignment, submission, courseSlug }: Props) {
  const status = submission?.status ?? null;
  const href = `/courses/${courseSlug}/assignments/${assignment.id}`;

  const truncatedDesc = assignment.description
    ? assignment.description.length > 80
      ? assignment.description.slice(0, 80) + "…"
      : assignment.description
    : null;

  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const isPastDue = dueDate && dueDate < new Date();
  const formattedDue = dueDate
    ? dueDate.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <Card className="hover:bg-muted/20 transition-colors">
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <ClipboardList className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{assignment.title}</p>
              {formattedDue && (
                <p className={`text-xs mt-0.5 flex items-center gap-1 ${isPastDue ? "text-destructive" : "text-muted-foreground"}`}>
                  <Clock className="w-3 h-3" />
                  ส่งภายใน {formattedDue}
                </p>
              )}
              {truncatedDesc && (
                <p className="text-xs text-muted-foreground mt-1">{truncatedDesc}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={status ? STATUS_VARIANT[status] : "outline"} className="text-xs">
              {status ? STATUS_LABEL[status] : "ยังไม่ส่ง"}
            </Badge>
            <Link href={href}>
              <Button size="sm" variant="outline" className="text-xs h-7 px-2.5">
                {getCTALabel(status)} →
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
