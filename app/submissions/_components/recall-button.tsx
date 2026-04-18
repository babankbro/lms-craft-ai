"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { recallSubmissionFromList } from "../actions";

interface Props {
  submissionId: number;
}

export function RecallButton({ submissionId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleRecall() {
    setError("");
    startTransition(async () => {
      try {
        await recallSubmissionFromList(submissionId);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleRecall}
        title="ถอนงานกลับมาแก้ไข (ก่อนครบกำหนด)"
      >
        <Undo2 className="h-3.5 w-3.5 mr-1.5" />
        {isPending ? "กำลังถอน..." : "ถอนงาน"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
