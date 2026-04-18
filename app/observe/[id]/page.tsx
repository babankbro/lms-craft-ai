/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { requireAuth, canReview } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function saveScore(videoId: string, evaluatorId: string, score: number, feedback: string) {
  "use server";
  await (prisma.observationScore as any).upsert({
    where: { videoId_evaluatorId: { videoId, evaluatorId } },
    create: { id: `${videoId}-${evaluatorId}`, videoId, evaluatorId, score, feedback },
    update: { score, feedback },
  });
}

export default async function ObservationVideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const video = await (prisma.observationVideo as any).findUnique({
    where: { id },
    include: {
      uploader: { select: { fullName: true, mentorId: true } },
      scores: {
        include: { evaluator: { select: { fullName: true, role: true } } },
      },
    },
  });

  if (!video) notFound();

  // Access: owner, ADMIN, MENTOR (own mentees), INSTRUCTOR/ADMIN all
  const isOwner = video.uploaderId === user.id;
  const isReviewer = canReview(user.role);
  if (!isOwner && !isReviewer) redirect("/observe");

  // MENTOR: only own mentees' videos
  if (user.role === "MENTOR" && video.uploader.mentorId !== user.id) redirect("/observe");

  const myScore = video.scores.find((s: any) => s.evaluatorId === user.id);
  const isYouTube = !!video.youtubeUrl;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/observe" className="text-sm text-muted-foreground hover:underline">← กลับ</Link>
        <h1 className="text-2xl font-bold mt-1">{video.title}</h1>
        <p className="text-muted-foreground">อัปโหลดโดย: {video.uploader.fullName}</p>
      </div>

      {/* Video playback */}
      <Card>
        <CardContent className="pt-4">
          {isYouTube ? (
            <div className="aspect-video">
              <iframe
                className="w-full h-full rounded-md"
                src={`https://www.youtube.com/embed/${new URL(video.youtubeUrl).searchParams.get("v") ?? ""}`}
                allowFullScreen
              />
            </div>
          ) : video.fileKey ? (
            <div className="space-y-2">
              <video
                controls
                className="w-full rounded-md"
                src={`/api/files/${video.fileKey}`}
              />
              <a
                href={`/api/files/${video.fileKey}`}
                className="text-sm text-primary hover:underline"
              >
                ดาวน์โหลดวิดีโอ
              </a>
            </div>
          ) : (
            <p className="text-muted-foreground">ไม่มีวิดีโอ</p>
          )}
          {video.description && (
            <p className="text-sm text-muted-foreground mt-3">{video.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Scoring panel for reviewers */}
      {isReviewer && !isOwner && (
        <Card>
          <CardHeader><CardTitle>ให้คะแนน</CardTitle></CardHeader>
          <CardContent>
            <form
              action={async (formData: FormData) => {
                "use server";
                const score = parseInt(formData.get("score") as string);
                const feedback = formData.get("feedback") as string;
                await saveScore(id, user.id, score, feedback);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="score">คะแนน (0–100)</Label>
                  <Input
                    id="score"
                    name="score"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={myScore?.score ?? ""}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">ข้อเสนอแนะ</Label>
                <textarea
                  id="feedback"
                  name="feedback"
                  rows={3}
                  defaultValue={myScore?.feedback ?? ""}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit">บันทึกคะแนน</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Scores list */}
      <Card>
        <CardHeader><CardTitle>คะแนนที่ได้รับ ({video.scores.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {video.scores.map((s: any) => (
            <div key={s.id} className="border-l-2 border-muted pl-4">
              <p className="text-sm font-medium">{s.evaluator.fullName} ({s.evaluator.role})</p>
              <p className="text-sm">คะแนน: <strong>{s.score}</strong></p>
              {s.feedback && <p className="text-sm text-muted-foreground">{s.feedback}</p>}
            </div>
          ))}
          {video.scores.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มีคะแนน</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
