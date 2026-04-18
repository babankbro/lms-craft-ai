/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { updateAssignment, deleteAssignment } from "@/app/teach/[courseId]/assignments/actions";
import {
  addQuestion,
  deleteQuestion,
  reorderQuestion,
} from "@/app/teach/[courseId]/assignments/[id]/question-actions";
import { AttachmentUploadPanel } from "@/app/teach/[courseId]/assignments/[id]/_components/attachment-upload-panel";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RESPONSE_TYPE_LABEL: Record<string, string> = {
  TEXT: "ข้อความ",
  FILE: "ไฟล์",
  BOTH: "ข้อความ + ไฟล์",
};

export default async function AdminAssignmentEditPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const { id, assignmentId } = await params;
  const courseId = parseInt(id);
  const aId = parseInt(assignmentId);

  const assignment = await (prisma.assignment as any).findUnique({
    where: { id: aId },
    include: {
      lesson: { select: { id: true, title: true, courseId: true, course: { select: { authorId: true } } } },
      course: { select: { id: true, authorId: true, title: true } },
      attachments: { orderBy: { createdAt: "asc" } },
      questions: { orderBy: { order: "asc" } },
    },
  });

  const assignmentCourseId = assignment?.lesson?.courseId ?? assignment?.course?.id;
  if (!assignment || assignmentCourseId !== courseId) notFound();

  const authorId = assignment.lesson?.course?.authorId ?? assignment.course?.authorId;
  if (user.role !== "ADMIN" && authorId !== user.id) notFound();

  const submissionCount = await prisma.submission.count({ where: { assignmentId: aId } });
  const questions: any[] = assignment.questions ?? [];

  const scope = assignment.lessonId != null ? "lesson" : "course";

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={`/admin/courses/${courseId}/assignments`} className="text-sm text-muted-foreground hover:underline">
          ← กลับ
        </Link>
        <h1 className="text-2xl font-bold mt-2">แก้ไขงานมอบหมาย</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {scope === "lesson"
            ? `บทเรียน: ${assignment.lesson?.title ?? "—"}`
            : `ระดับวิชา: ${assignment.course?.title ?? "—"}`}
          {submissionCount > 0 && (
            <span className="ml-2 text-amber-600">· {submissionCount} การส่งงาน</span>
          )}
        </p>
      </div>

      {/* Basic settings */}
      <Card>
        <CardHeader><CardTitle>ข้อมูลงาน</CardTitle></CardHeader>
        <CardContent>
          <form action={updateAssignment.bind(null, aId, courseId)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">ชื่องาน *</Label>
              <Input id="title" name="title" required defaultValue={assignment.title} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย / โจทย์งาน</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={assignment.description}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxFileSizeMB">ขนาดไฟล์สูงสุด (MB)</Label>
                <Input
                  id="maxFileSizeMB"
                  name="maxFileSizeMB"
                  type="number"
                  defaultValue={Math.round(assignment.maxFileSize / 1024 / 1024)}
                  min={1}
                  max={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">กำหนดส่ง</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                  defaultValue={
                    assignment.dueDate
                      ? new Date(assignment.dueDate).toISOString().slice(0, 16)
                      : ""
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowedTypes">ประเภทไฟล์ที่อนุญาต</Label>
              <Input
                id="allowedTypes"
                name="allowedTypes"
                defaultValue={assignment.allowedTypes.join(",")}
              />
            </div>
            <Button type="submit">บันทึก</Button>
          </form>

          {submissionCount === 0 && (
            <form action={deleteAssignment.bind(null, aId, courseId, false)} className="mt-4 pt-4 border-t">
              <Button type="submit" variant="destructive">ลบงานมอบหมาย</Button>
            </form>
          )}
          {submissionCount > 0 && user.role === "ADMIN" && (
            <form action={deleteAssignment.bind(null, aId, courseId, true)} className="mt-4 pt-4 border-t">
              <Button type="submit" variant="destructive">
                บังคับลบ (มี {submissionCount} งานส่ง)
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Attachment files */}
      <AttachmentUploadPanel
        assignmentId={aId}
        courseId={courseId}
        initialAttachments={
          (assignment.attachments ?? []).map((a: any) => ({
            id: a.id,
            kind: a.kind,
            fileName: a.fileName,
            fileKey: a.fileKey,
            fileSize: a.fileSize,
            visibility: a.visibility,
          }))
        }
      />

      <Separator />

      {/* Question builder */}
      <Card>
        <CardHeader>
          <CardTitle>แบบฟอร์มคำถาม ({questions.length} ข้อ)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              ยังไม่มีคำถาม — เพิ่มคำถามด้านล่าง
            </p>
          )}

          {questions.map((q: any, idx: number) => (
            <div key={q.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1">
                  <span className="text-muted-foreground mr-1">ข้อ {idx + 1}.</span>
                  {q.prompt}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {RESPONSE_TYPE_LABEL[q.responseType] ?? q.responseType}
                  </Badge>
                  {q.maxFiles != null && (
                    <Badge variant="secondary" className="text-xs">สูงสุด {q.maxFiles} ไฟล์</Badge>
                  )}
                  {!q.required && (
                    <Badge variant="secondary" className="text-xs">ไม่บังคับ</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 justify-end">
                {idx > 0 && (
                  <form action={reorderQuestion.bind(null, q.id, aId, "up")}>
                    <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
                {idx < questions.length - 1 && (
                  <form action={reorderQuestion.bind(null, q.id, aId, "down")}>
                    <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
                <form action={deleteQuestion.bind(null, q.id, aId)}>
                  <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          ))}

          {/* Add question form */}
          <form action={addQuestion.bind(null, aId)} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-semibold">เพิ่มคำถามใหม่</p>
            <div className="space-y-2">
              <Label htmlFor="prompt">โจทย์ / คำถาม *</Label>
              <textarea
                id="prompt"
                name="prompt"
                rows={3}
                required
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="ระบุคำถามหรือโจทย์สำหรับนักเรียน"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="responseType">ประเภทคำตอบ</Label>
                <select
                  id="responseType"
                  name="responseType"
                  defaultValue="TEXT"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {Object.entries(RESPONSE_TYPE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxFiles">ไฟล์สูงสุด (ถ้าเลือก FILE/BOTH)</Label>
                <Input id="maxFiles" name="maxFiles" type="number" min={1} max={10} placeholder="ค่าเริ่มต้น: ไม่จำกัด" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="required" name="required" value="true" defaultChecked className="h-4 w-4" />
              <Label htmlFor="required" className="text-sm cursor-pointer">บังคับตอบ</Label>
            </div>
            <Button type="submit" size="sm">เพิ่มคำถาม</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
