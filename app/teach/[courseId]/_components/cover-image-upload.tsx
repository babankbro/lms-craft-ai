"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { updateCoverImage } from "@/app/teach/actions";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2 } from "lucide-react";

interface Props {
  courseId: number;
  currentKey: string | null;
}

export function CoverImageUpload({ courseId, currentKey }: Props) {
  const [fileKey, setFileKey] = useState(currentKey);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prefix", `covers/${courseId}`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "อัปโหลดไม่สำเร็จ");
        return;
      }
      const { fileKey: newKey } = await res.json();
      await updateCoverImage(courseId, newKey);
      setFileKey(newKey);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className="relative w-full h-40 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
      >
        {fileKey ? (
          <Image
            src={`/api/files/preview/${fileKey}`}
            alt="Course cover"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-sm">คลิกเพื่ออัปโหลดรูปปก</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
      {fileKey && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          เปลี่ยนรูปปก
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
