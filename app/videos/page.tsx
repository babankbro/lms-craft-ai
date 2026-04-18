/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireAuth } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const user = await requireAuth();

  const videos = await (prisma as any).observationVideo.findMany({
    where: { uploaderId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const allVideos = user.role === "ADMIN"
    ? await (prisma as any).observationVideo.findMany({
        orderBy: { createdAt: "desc" },
        include: { uploader: { select: { fullName: true } } },
      })
    : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">วิดีโอนิเทศ</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>อัปโหลดวิดีโอ</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              "use server";
              const { requireAuth } = await import("@/lib/permissions");
              const { prisma } = await import("@/lib/prisma");
              const user = await requireAuth();

              const title = formData.get("title") as string;
              const youtubeUrl = (formData.get("youtubeUrl") as string) || null;
              const description = (formData.get("description") as string) || null;

              await (prisma as any).observationVideo.create({
                data: {
                  uploaderId: user.id,
                  title,
                  youtubeUrl,
                  description,
                },
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">ชื่อวิดีโอ</label>
              <input
                name="title"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">YouTube URL</label>
              <input
                name="youtubeUrl"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">รายละเอียด</label>
              <textarea
                name="description"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
            >
              อัปโหลด
            </button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">วิดีโอของฉัน</h2>
      {videos.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">ยังไม่มีวิดีโอ</p>
      ) : (
        <div className="grid gap-4">
          {videos.map((video: any) => (
            <Card key={video.id}>
              <CardContent className="pt-4">
                <p className="font-medium">{video.title}</p>
                {video.youtubeUrl && (
                  <a
                    href={video.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    ดูบน YouTube
                  </a>
                )}
                {video.description && (
                  <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {user.role === "ADMIN" && allVideos.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4 mt-8">วิดีโอทั้งหมด</h2>
          <div className="grid gap-4">
            {allVideos.map((video: any) => (
              <Card key={video.id}>
                <CardContent className="pt-4">
                  <p className="font-medium">{video.title}</p>
                  <p className="text-sm text-muted-foreground">
                    อัปโหลดโดย: {video.uploader.fullName}
                  </p>
                  {video.youtubeUrl && (
                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      ดูบน YouTube
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
