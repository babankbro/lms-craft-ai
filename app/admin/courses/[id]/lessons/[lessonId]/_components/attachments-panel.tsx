"use client";

import { useState } from "react";
import { addAttachment, removeAttachment } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Attachment {
  id: number;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

interface AttachmentsPanelProps {
  lessonId: number;
  attachments: Attachment[];
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "text/plain",
  "application/zip",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({ lessonId, attachments }: AttachmentsPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`ไฟล์ ${file.name} ใหญ่เกิน 10MB`);
          continue;
        }
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          setError(`ชนิดไฟล์ ${file.type} ไม่รองรับ`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("prefix", `lessons/${lessonId}`);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "อัปโหลดล้มเหลว");
          continue;
        }

        const meta = await res.json();
        await addAttachment({
          lessonId,
          fileKey: meta.fileKey,
          fileName: meta.fileName,
          fileSize: meta.fileSize,
          mimeType: meta.mimeType,
        });
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการอัปโหลด");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ไฟล์แนบ ({attachments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label
            htmlFor="attachment-upload"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer"
          >
            {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์แนบ"}
          </label>
          <input
            id="attachment-upload"
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            accept={ALLOWED_MIME_TYPES.join(",")}
          />
          <p className="text-xs text-muted-foreground mt-1">
            สูงสุด 10MB ต่อไฟล์ | PDF, Word, Excel, PPT, PNG, JPG, TXT, ZIP
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {attachments.length > 0 ? (
          <ul className="space-y-2">
            {attachments.map((att) => (
              <li
                key={att.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div>
                  <a
                    href={`/api/files/${att.fileKey}`}
                    className="text-sm font-medium text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {att.fileName}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(att.fileSize)} · {att.mimeType}
                  </p>
                </div>
                <form action={removeAttachment.bind(null, att.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    ลบ
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีไฟล์แนบ</p>
        )}
      </CardContent>
    </Card>
  );
}
