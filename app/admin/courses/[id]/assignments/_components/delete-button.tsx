"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteCourseAssignment } from "../actions";

interface Props {
  assignmentId: number;
  courseId: number;
  hasSubmissions: boolean;
}

export function DeleteAssignmentButton({ assignmentId, courseId, hasSubmissions }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("ต้องการลบงานนี้?")) return;
    startTransition(async () => {
      await deleteCourseAssignment(assignmentId, courseId);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending || hasSubmissions}
      onClick={handleDelete}
      title={hasSubmissions ? "ไม่สามารถลบได้: มีงานที่ส่งแล้ว" : "ลบงาน"}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
