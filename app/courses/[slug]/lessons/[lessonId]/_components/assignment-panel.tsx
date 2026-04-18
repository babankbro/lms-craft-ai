"use client";

import { useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, FileImage, FileVideo, FileArchive, File,
  Upload, X, CheckCircle2, ExternalLink, AlertCircle, Clock, ShieldAlert, Undo2,
} from "lucide-react";
import {
  startDraftSubmission,
  attachSubmissionFile,
  removeSubmissionFile,
  submitSubmission,
  resubmitSubmission,
  recallSubmission,
  saveAnswerText,
  attachAnswerFile,
} from "../submit/actions";

// ─── Types ──────────────────────────────────────────────────────────────────

type AssignmentFile = { id: number; fileName: string; fileSize: number; fileKey: string; answerId?: number | null };

type AnswerState = {
  id?: number;
  textAnswer: string;
  files: AssignmentFile[];
};

type Submission = {
  id: number;
  status: string;
  score: number | null;
  maxScore: number | null;
  files: AssignmentFile[];
  answers: { questionId: number; textAnswer: string | null; files: AssignmentFile[] }[];
} | null;

type Question = {
  id: number;
  order: number;
  prompt: string;
  responseType: "TEXT" | "FILE" | "BOTH";
  required: boolean;
  maxLength: number | null;
  maxFiles: number | null;
};

type Assignment = {
  id: number;
  title: string;
  description: string;
  maxFileSize: number;
  allowedTypes: string[];
  dueDate: Date | null;
  questions: Question[];
};

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  SUBMITTED: "ส่งแล้ว",
  UNDER_REVIEW: "กำลังตรวจ",
  REVISION_REQUESTED: "แก้ไข",
  APPROVED: "ผ่าน",
  REJECTED: "ไม่ผ่าน",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  UNDER_REVIEW: "default",
  REVISION_REQUESTED: "destructive",
  APPROVED: "default",
  REJECTED: "destructive",
};

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <FileImage className="h-4 w-4 shrink-0 text-blue-500" />;
  if (["mp4", "mov", "avi", "webm"].includes(ext))
    return <FileVideo className="h-4 w-4 shrink-0 text-purple-500" />;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return <FileArchive className="h-4 w-4 shrink-0 text-yellow-500" />;
  if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext))
    return <FileText className="h-4 w-4 shrink-0 text-red-500" />;
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DueDateBadge({ dueDate }: { dueDate: Date | null }) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const isPast = due < now;
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return (
    <div className={`flex items-center gap-1.5 text-xs ${isPast ? "text-destructive" : diffDays <= 3 ? "text-orange-600" : "text-muted-foreground"}`}>
      <Clock className="h-3 w-3" />
      {isPast
        ? `เกินกำหนดส่ง ${due.toLocaleDateString("th-TH")}`
        : diffDays === 0
        ? "ครบกำหนดวันนี้"
        : `กำหนดส่ง ${due.toLocaleDateString("th-TH")} (อีก ${diffDays} วัน)`}
    </div>
  );
}

// ─── File list sub-component ─────────────────────────────────────────────────

function FileList({
  files,
  canEdit,
  onRemove,
}: {
  files: AssignmentFile[];
  canEdit: boolean;
  onRemove: (id: number) => void;
}) {
  if (files.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 p-2.5 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          {getFileIcon(f.fileName)}
          <a
            href={`/api/files/preview/${f.fileKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0"
          >
            <p className="text-sm font-medium truncate hover:underline">{f.fileName}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(f.fileSize)}</p>
          </a>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`/api/files/preview/${f.fileKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {canEdit && (
              <button
                onClick={() => onRemove(f.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="ลบไฟล์"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Question row ─────────────────────────────────────────────────────────────

function QuestionRow({
  question,
  answer,
  canEdit,
  submissionId,
  maxFileSize,
  allowedTypes,
  onAnswerChange,
  onFileAdded,
  onFileRemoved,
}: {
  question: Question;
  answer: AnswerState;
  canEdit: boolean;
  submissionId: number;
  maxFileSize: number;
  allowedTypes: string[];
  onAnswerChange: (text: string) => void;
  onFileAdded: (file: AssignmentFile) => void;
  onFileRemoved: (fileId: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSaving, startSaving] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const needsText = question.responseType === "TEXT" || question.responseType === "BOTH";
  const needsFile = question.responseType === "FILE" || question.responseType === "BOTH";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadError("");
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > maxFileSize) {
          setUploadError(`ไฟล์ "${file.name}" เกินขนาดที่กำหนด (${(maxFileSize / 1024 / 1024).toFixed(0)} MB)`);
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("prefix", `submissions/${submissionId}/q${question.id}`);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Upload failed");
        }
        const { fileKey } = await res.json();
        await attachAnswerFile(submissionId, question.id, {
          fileName: file.name,
          fileKey,
          fileSize: file.size,
          mimeType: file.type,
        });
        onFileAdded({ id: Date.now() + Math.random(), fileName: file.name, fileSize: file.size, fileKey });
      }
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleBlur() {
    startSaving(async () => {
      await saveAnswerText(submissionId, question.id, answer.textAnswer);
    });
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-bold w-5 h-5 flex items-center justify-center mt-0.5">
          {question.order}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {question.prompt}
            {question.required && <span className="text-destructive ml-1">*</span>}
          </p>
        </div>
      </div>

      {needsText && (
        <div className="pl-7">
          <Textarea
            placeholder="พิมพ์คำตอบ..."
            value={answer.textAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            onBlur={canEdit ? handleBlur : undefined}
            readOnly={!canEdit}
            maxLength={question.maxLength ?? undefined}
            rows={3}
            className="text-sm resize-none"
          />
          {question.maxLength && (
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {answer.textAnswer.length}/{question.maxLength}
            </p>
          )}
          {isSaving && <p className="text-xs text-muted-foreground mt-0.5">บันทึกอัตโนมัติ...</p>}
        </div>
      )}

      {needsFile && canEdit && (
        <div className="pl-7 space-y-2">
          <FileList files={answer.files} canEdit={canEdit} onRemove={onFileRemoved} />
          {question.maxFiles != null && (
            <p className="text-xs text-muted-foreground">
              อัปโหลดได้สูงสุด {question.maxFiles} ไฟล์
              {answer.files.length > 0 && ` (${answer.files.length}/${question.maxFiles})`}
            </p>
          )}
          {(question.maxFiles == null || answer.files.length < question.maxFiles) && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {uploading ? "กำลังอัปโหลด..." : "แนบไฟล์"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={allowedTypes.join(",") || undefined}
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </div>
      )}

      {needsFile && !canEdit && (
        <div className="pl-7">
          <FileList files={answer.files} canEdit={false} onRemove={() => {}} />
        </div>
      )}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

interface Props {
  assignment: Assignment;
  submission: Submission;
  courseSlug: string;
  lessonId: number | null;
}

export function AssignmentPanel({ assignment, submission: initialSub, courseSlug, lessonId }: Props) {
  const [submission, setSubmission] = useState<Submission>(initialSub);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-question answer state (text + per-question files)
  const [answers, setAnswers] = useState<Record<number, AnswerState>>(() => {
    const initial: Record<number, AnswerState> = {};
    for (const q of assignment.questions) {
      const existing = initialSub?.answers?.find((a) => a.questionId === q.id);
      initial[q.id] = {
        textAnswer: existing?.textAnswer ?? "",
        files: existing?.files ?? [],
      };
    }
    return initial;
  });

  const hasQuestions = assignment.questions.length > 0;

  const canEdit =
    !submission ||
    submission.status === "DRAFT" ||
    submission.status === "REVISION_REQUESTED";

  const canRecall =
    submission?.status === "SUBMITTED" &&
    (!assignment.dueDate || new Date() < new Date(assignment.dueDate));

  // For free-form upload (no questions), require at least one file
  // For question-based, require that required questions have text or files
  const freeFiles = (submission?.files ?? []).filter((f) => !f.answerId);

  const canSubmit = (() => {
    if (!submission) return false;
    if (!["DRAFT", "REVISION_REQUESTED"].includes(submission.status)) return false;
    if (hasQuestions) {
      // Block if any FILE/BOTH question exceeds maxFiles (race-condition guard)
      const exceeds = assignment.questions.some((q) => {
        if (q.maxFiles == null) return false;
        const a = answers[q.id];
        return (a?.files.length ?? 0) > q.maxFiles;
      });
      if (exceeds) return false;
      // Must have answered all required questions (text or file)
      return assignment.questions
        .filter((q) => q.required)
        .every((q) => {
          const a = answers[q.id];
          if (!a) return false;
          if (q.responseType === "TEXT") return a.textAnswer.trim().length > 0;
          if (q.responseType === "FILE") return a.files.length > 0;
          return a.textAnswer.trim().length > 0 || a.files.length > 0;
        });
    }
    return freeFiles.length > 0;
  })();

  async function handleStart() {
    setError("");
    try {
      const id = await startDraftSubmission(assignment.id);
      setSubmission({ id, status: "DRAFT", score: null, maxScore: null, files: [], answers: [] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Free-form file upload (used when no questions or for general files)
  async function uploadFiles(files: File[]) {
    if (!files.length || !submission) return;
    for (const file of files) {
      if (file.size > assignment.maxFileSize) {
        setError(`ไฟล์ "${file.name}" เกินขนาดที่กำหนด (${(assignment.maxFileSize / 1024 / 1024).toFixed(0)} MB)`);
        return;
      }
    }
    setError("");
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round((i / files.length) * 80));
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("prefix", `submissions/${submission.id}`);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Upload failed");
        }
        const { fileKey } = await res.json();
        await attachSubmissionFile(submission.id, {
          fileName: file.name,
          fileKey,
          fileSize: file.size,
          mimeType: file.type,
        });
        setSubmission((prev) =>
          prev ? { ...prev, files: [...prev.files, { id: Date.now() + i, fileName: file.name, fileSize: file.size, fileKey }] } : prev
        );
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setUploadProgress(null);
        return;
      }
    }
    setTimeout(() => setUploadProgress(null), 800);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    await uploadFiles(Array.from(e.target.files ?? []));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (!canEdit || !submission) return;
    uploadFiles(Array.from(e.dataTransfer.files));
  }

  async function handleRemoveFile(fileId: number) {
    try {
      await removeSubmissionFile(fileId);
      setSubmission((prev) =>
        prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : prev
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleSubmit() {
    if (!submission) return;
    startTransition(async () => {
      try {
        if (submission.status === "REVISION_REQUESTED") {
          await resubmitSubmission(submission.id, courseSlug, lessonId);
        } else {
          await submitSubmission(submission.id, courseSlug, lessonId);
        }
        setSubmission((prev) => prev ? { ...prev, status: "SUBMITTED" } : prev);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleRecall() {
    if (!submission) return;
    startTransition(async () => {
      try {
        await recallSubmission(submission.id, courseSlug, lessonId);
        setSubmission((prev) => prev ? { ...prev, status: "DRAFT", } : prev);
        setError("");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base">{assignment.title}</CardTitle>
            {assignment.description && (
              <p className="text-sm text-muted-foreground">{assignment.description}</p>
            )}
            <DueDateBadge dueDate={assignment.dueDate} />
          </div>
          {submission && (
            <Badge variant={STATUS_VARIANT[submission.status] ?? "outline"} className="shrink-0">
              {STATUS_LABEL[submission.status] ?? submission.status}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* UNDER_REVIEW lock */}
        {submission?.status === "UNDER_REVIEW" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
            <ShieldAlert className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-400">
              งานของคุณกำลังอยู่ระหว่างการตรวจ — ไม่สามารถแก้ไขได้จนกว่าผู้ตรวจจะดำเนินการเสร็จ
            </p>
          </div>
        )}

        {/* Score */}
        {submission?.status === "APPROVED" && submission.score != null && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              คะแนน: {submission.score}{submission.maxScore ? `/${submission.maxScore}` : ""}
            </p>
          </div>
        )}

        {/* Start button */}
        {!submission && (
          <Button onClick={handleStart} disabled={isPending} className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" />
            เริ่มส่งงาน
          </Button>
        )}

        {/* ── Questions ───────────────────────────────────────────────── */}
        {submission && hasQuestions && (
          <div className="space-y-3">
            {assignment.questions.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                answer={answers[q.id] ?? { textAnswer: "", files: [] }}
                canEdit={canEdit}
                submissionId={submission.id}
                maxFileSize={assignment.maxFileSize}
                allowedTypes={assignment.allowedTypes}
                onAnswerChange={(text) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], textAnswer: text } }))
                }
                onFileAdded={(file) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q.id]: { ...prev[q.id], files: [...(prev[q.id]?.files ?? []), file] },
                  }))
                }
                onFileRemoved={(fileId) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q.id]: { ...prev[q.id], files: prev[q.id]?.files.filter((f) => f.id !== fileId) ?? [] },
                  }))
                }
              />
            ))}
          </div>
        )}

        {/* ── Free-form file upload (shown when no questions, or always for extra files) ── */}
        {submission && !hasQuestions && (
          <>
            {freeFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  ไฟล์ที่แนบ ({freeFiles.length})
                </p>
                <FileList files={freeFiles} canEdit={canEdit} onRemove={handleRemoveFile} />
              </div>
            )}

            {uploadProgress !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>กำลังอัปโหลด...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            )}

            {canEdit && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <Upload className={`h-6 w-6 mx-auto mb-2 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium">{isDragOver ? "วางไฟล์ที่นี่" : "คลิกหรือลากไฟล์มาวาง"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {assignment.allowedTypes.length > 0
                    ? `รองรับ: ${assignment.allowedTypes.join(", ")}`
                    : "รองรับทุกประเภทไฟล์"}
                  {" "}· สูงสุด {(assignment.maxFileSize / 1024 / 1024).toFixed(0)} MB ต่อไฟล์
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={assignment.allowedTypes.join(",") || undefined}
                  onChange={handleFileChange}
                  disabled={uploadProgress !== null}
                  className="hidden"
                />
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Submit + recall + view link */}
        <div className="flex items-center gap-3 flex-wrap">
          {canSubmit && (
            <Button onClick={handleSubmit} disabled={isPending || uploadProgress !== null}>
              {isPending
                ? "กำลังส่ง..."
                : submission?.status === "REVISION_REQUESTED"
                ? "ส่งงานใหม่"
                : "ส่งงาน"}
            </Button>
          )}
          {canRecall && (
            <Button
              variant="outline"
              onClick={handleRecall}
              disabled={isPending}
              title="ถอนงานกลับมาแก้ไข (ก่อนครบกำหนด)"
            >
              <Undo2 className="h-4 w-4 mr-1.5" />
              {isPending ? "กำลังถอน..." : "ถอนงาน"}
            </Button>
          )}
          {submission && submission.status !== "DRAFT" && (
            <a
              href={`/submissions/${submission.id}`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              ดูรายละเอียด
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
