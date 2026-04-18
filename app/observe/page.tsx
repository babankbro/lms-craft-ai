import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ObservePage() {
  const user = await requireAuth();

  // STUDENTs see their own videos; reviewers see mentees' or all
  const where =
    user.role === "STUDENT"
      ? { uploaderId: user.id }
      : user.role === "MENTOR"
      ? { uploader: { mentorId: user.id } }
      : {};

  const videos = await prisma.observationVideo.findMany({
    where,
    include: {
      uploader: { select: { fullName: true } },
      scores: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">วิดีโอนิเทศ</h1>
        {user.role === "STUDENT" && (
          <Link href="/observe/new">
            <Button>+ อัปโหลดวิดีโอ</Button>
          </Link>
        )}
      </div>

      {videos.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            ยังไม่มีวิดีโอ
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {videos.map((v) => (
          <Card key={v.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{v.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    อัปโหลดโดย: {v.uploader.fullName}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {v.youtubeUrl && <Badge variant="outline">YouTube</Badge>}
                  {v.fileKey && <Badge variant="secondary">ไฟล์</Badge>}
                  <Badge variant="outline">{v.scores.length} คะแนน</Badge>
                  <Link href={`/observe/${v.id}`}>
                    <Button variant="outline" size="sm">ดู</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            {v.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{v.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
