import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAssignment, deleteAssignment } from "../actions";
import { addQuestion, deleteQuestion, reorderQuestion } from "./question-actions";
import { AttachmentUploadPanel } from "./_components/attachment-upload-panel";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RESPONSE_TYPE_LABEL: Record<string, string> = {
  TEXT: "ข้อความ",
  FILE: "ไฟล์",
  BOTH: "ข้อความ + ไฟล์",
};

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string; id: string }>;
}) {
  const user = await requireAuth();
  if (!canAuthor(user.role)) redirect("/dashboard");

  const { courseId: courseIdStr, id: idStr } = await params;
  const courseId = parseInt(courseIdStr);
  const id = parseInt(idStr);

  const assignment = await (prisma.assignment as any).findUnique({
    where: { id },
    include: {
      lesson: { include: { course: true } },
      attachments: { orderBy: { createdAt: "asc" } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!assignment || assignment.lesson.courseId !== courseId) notFound();
  if (user.role !== "ADMIN" && assignment.lesson.course.authorId !== user.id) redirect("/teach");

  const submissionCount = await prisma.submission.count({ where: { assignmentId: id } });
  const questions: any[] = assignment.questions ?? [];

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <Link href={`/teach/${courseId}/assignments`} className="text-sm text-muted-foreground hover:underline">
        ← กลับ
      </Link>
      <h1 className="text-2xl font-bold">แก้ไขงานมอบหมาย</h1>

      {/* ── Basic settings ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลงาน</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAssignment.bind(null, id, courseId)} className="space-y-4">
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
            <form action={deleteAssignment.bind(null, id, courseId, false)} className="mt-4 pt-4 border-t">
              <Button type="submit" variant="destructive">ลบงานมอบหมาย</Button>
            </form>
          )}
          {submissionCount > 0 && user.role === "ADMIN" && (
            <form action={deleteAssignment.bind(null, id, courseId, true)} className="mt-4 pt-4 border-t">
              <Button type="submit" variant="destructive">
                บังคับลบ (มี {submissionCount} งานส่ง)
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Attachment files ────────────────────────────────────────────── */}
      <AttachmentUploadPanel
        assignmentId={id}
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

      {/* ── Question builder ────────────────────────────────────────────── */}
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

          {/* Existing questions */}
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
                  <form action={reorderQuestion.bind(null, q.id, id, "up")}>
                    <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
                {idx < questions.length - 1 && (
                  <form action={reorderQuestion.bind(null, q.id, id, "down")}>
                    <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
                <form action={deleteQuestion.bind(null, q.id, id)}>
                  <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          ))}

          {/* Add new question */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">เพิ่มคำถามใหม่</p>
            <form action={addQuestion.bind(null, id)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="prompt" className="text-xs">คำถาม / โจทย์ *</Label>
                <textarea
                  id="prompt"
                  name="prompt"
                  rows={2}
                  required
                  placeholder="พิมพ์คำถามหรือโจทย์..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">รูปแบบคำตอบ</Label>
                  <Select name="responseType" defaultValue="TEXT">
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">ข้อความ</SelectItem>
                      <SelectItem value="FILE">ไฟล์</SelectItem>
                      <SelectItem value="BOTH">ข้อความ + ไฟล์</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">บังคับตอบ</Label>
                  <Select name="required" defaultValue="true">
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">บังคับ</SelectItem>
                      <SelectItem value="false">ไม่บังคับ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ความยาวสูงสุด (อักษร)</Label>
                  <Input name="maxLength" type="number" min={0} placeholder="ไม่จำกัด" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">จำนวนไฟล์สูงสุด</Label>
                  <Input name="maxFiles" type="number" min={1} placeholder="ไม่จำกัด" className="h-8 text-sm" />
                </div>
              </div>
              <Button type="submit" size="sm">เพิ่มคำถาม</Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
