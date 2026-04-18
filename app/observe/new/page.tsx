"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewObservationVideoPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/observe/videos", {
      method: "POST",
      body: JSON.stringify({
        title: fd.get("title"),
        description: fd.get("description"),
        youtubeUrl: fd.get("youtubeUrl") || undefined,
      }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      router.push("/observe");
    } else {
      const d = await res.json();
      setError(d.error ?? "เกิดข้อผิดพลาด");
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">อัปโหลดวิดีโอนิเทศ</h1>
      <Card>
        <CardHeader><CardTitle>ข้อมูลวิดีโอ</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">ชื่อวิดีโอ *</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL (หรืออัปโหลดไฟล์)</Label>
              <Input id="youtubeUrl" name="youtubeUrl" placeholder="https://youtube.com/watch?v=..." />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
