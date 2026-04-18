"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadedFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface FileUploadDropzoneProps {
  prefix: string;
  allowedTypes?: string[];
  maxFileSize?: number;
  onUploadComplete: (files: UploadedFile[]) => void;
  multiple?: boolean;
}

export function FileUploadDropzone({
  prefix,
  allowedTypes = ["application/pdf", "image/jpeg", "image/png"],
  maxFileSize = 10 * 1024 * 1024,
  onUploadComplete,
  multiple = true,
}: FileUploadDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      setError("");
      setUploading(true);
      const uploaded: UploadedFile[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        if (file.size > maxFileSize) {
          setError(`${file.name}: ไฟล์ใหญ่เกินไป (สูงสุด ${maxFileSize / 1024 / 1024}MB)`);
          continue;
        }

        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
          setError(`${file.name}: ประเภทไฟล์ไม่รองรับ`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("prefix", prefix);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Upload failed");
          continue;
        }

        uploaded.push(await res.json());
        setProgress(Math.round(((i + 1) / fileList.length) * 100));
      }

      setUploading(false);
      if (uploaded.length > 0) onUploadComplete(uploaded);
    },
    [prefix, allowedTypes, maxFileSize, onUploadComplete]
  );

  return (
    <div
      className="border-2 border-dashed rounded-lg p-8 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      }}
    >
      <p className="text-muted-foreground mb-4">
        ลากไฟล์มาวางที่นี่ หรือ
      </p>
      <input
        type="file"
        id="file-input"
        className="hidden"
        multiple={multiple}
        accept={allowedTypes.join(",")}
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
        }}
      />
      <Button
        variant="outline"
        onClick={() => document.getElementById("file-input")?.click()}
        disabled={uploading}
      >
        {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์"}
      </Button>

      {uploading && <Progress value={progress} className="mt-4" />}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
