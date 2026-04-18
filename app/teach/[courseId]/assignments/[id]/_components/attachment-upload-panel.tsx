"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { createAssignmentAttachment, deleteAssignmentAttachment } from "../attachment-actions";

type Attachment = {
  id: number;
  kind: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  visibility: string;
};

const KIND_LABEL: Record<string, string> = {
  PROMPT: "โจทย์ / คำถาม",
  GUIDE: "เฉลย / แนวทาง",
  EXAMPLE: "ตัวอย่างคำตอบ",
};

const VISIBILITY_LABEL: Record<string, string> = {
  STUDENT_ANYTIME: "นักเรียนเห็นตลอด",
  STUDENT_AFTER_SUBMIT: "เห็นหลังส่งงาน",
  STUDENT_AFTER_APPROVED: "เห็นหลังผ่านการตรวจ",
  INTERNAL_ONLY: "เฉพาะผู้ตรวจเท่านั้น",
};

const KIND_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PROMPT: "default",
  GUIDE: "secondary",
  EXAMPLE: "outline",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  assignmentId: number;
  courseId: number;
  initialAttachments: Attachment[];
}

export function AttachmentUploadPanel({ assignmentId, courseId, initialAttachments }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [kind, setKind] = useState<string>("PROMPT");
  const [visibility, setVisibility] = useState<string>("STUDENT_ANYTIME");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prefix", `assignments/${assignmentId}/${kind.toLowerCase()}`);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Upload failed");
      }
      const { fileKey } = await res.json();

      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("visibility", visibility);
      fd.append("fileName", file.name);
      fd.append("fileKey", fileKey);
      fd.append("fileSize", String(file.size));
      fd.append("mimeType", file.type);

      await createAssignmentAttachment(assignmentId, courseId, fd);

      setAttachments((prev) => [
        ...prev,
        { id: Date.now(), kind, fileName: file.name, fileKey, fileSize: file.size, visibility },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(attachment: Attachment) {
    try {
      await deleteAssignmentAttachment(attachment.id, assignmentId, courseId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ไฟล์ประกอบงานมอบหมาย</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing attachments */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 border rounded-lg bg-muted/30">
                <Badge variant={KIND_VARIANT[a.kind] ?? "outline"} className="text-xs shrink-0">
                  {KIND_LABEL[a.kind] ?? a.kind}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(a.fileSize)} · {VISIBILITY_LABEL[a.visibility] ?? a.visibility}
                  </p>
                </div>
                <a
                  href={`/api/files/preview/${a.fileKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDelete(a)}
                  className="text-muted-foreground hover:text-destructive"
                  title="ลบไฟล์"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">ประเภทไฟล์</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">การแสดงผลต่อนักเรียน</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VISIBILITY_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์เพื่ออัปโหลด"}
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
