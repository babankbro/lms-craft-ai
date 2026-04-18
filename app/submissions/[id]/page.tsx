/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { requireAuth, canReview } from "@/lib/permissions";
import { canRecallSubmission } from "@/lib/submission-state";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { addComment } from "@/app/review/actions";
import { RecallButton } from "../_components/recall-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง", SUBMITTED: "ส่งแล้ว", UNDER_REVIEW: "กำลังตรวจ",
  REVISION_REQUESTED: "แก้ไข", APPROVED: "ผ่าน", REJECTED: "ไม่ผ่าน",
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const submissionId = parseInt(id);

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        select: {
          title: true,
          description: true,
          dueDate: true,
          lesson: { include: { course: { select: { slug: true, title: true } } } },
          course: { select: { slug: true, title: true } },
        },
      },
      files: true,
      comments: {
        include: { author: { select: { fullName: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!submission) notFound();

  // Access control: student owner, reviewer, or admin
  const isOwner = submission.studentId === user.id;
  const isReviewer = canReview(user.role);
  if (!isOwner && !isReviewer) redirect("/dashboard");

  const isReviewed = canReview(user.role);
  const slug = submission.assignment.lesson?.course.slug ?? submission.assignment.course?.slug ?? "";
  const lessonId = submission.assignment.lesson?.id ?? null;

  // Filter internal comments for students
  const visibleComments = submission.comments.filter(
    (c) => !isReviewed ? !(c as any).isInternal : true
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/submissions" className="text-sm text-muted-foreground hover:underline">← งานของฉัน</Link>
          <h1 className="text-2xl font-bold mt-1">{submission.assignment.title}</h1>
          <p className="text-muted-foreground">
            {submission.assignment.lesson?.course.title ?? submission.assignment.course?.title ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{STATUS_LABEL[submission.status] ?? submission.status}</Badge>
          {isOwner && canRecallSubmission(submission.status, submission.assignment.dueDate) && (
            <RecallButton submissionId={submissionId} />
          )}
        </div>
      </div>

      {/* Score */}
      {submission.score != null && (
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p><strong>คะแนน:</strong> {submission.score}{submission.maxScore ? `/${submission.maxScore}` : ""}</p>
            {(submission as any).feedback && (
              <p><strong>ความคิดเห็น:</strong> {(submission as any).feedback}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Files */}
      <Card>
        <CardHeader>
          <CardTitle>ไฟล์ที่ส่ง ({submission.files.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {submission.files.map((f) => (
            <div key={f.id} className="flex gap-3 items-center">
              <a
                href={`/api/files/preview/${f.fileKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                {f.fileName}
              </a>
              <a
                href={`/api/files/${f.fileKey}`}
                className="text-xs text-muted-foreground hover:underline"
              >
                ดาวน์โหลด
              </a>
              <span className="text-xs text-muted-foreground">
                ({(f.fileSize / 1024).toFixed(1)} KB)
              </span>
            </div>
          ))}
          {submission.files.length === 0 && (
            <p className="text-sm text-muted-foreground">ยังไม่มีไฟล์</p>
          )}
        </CardContent>
      </Card>

      {/* Resubmit if revision requested */}
      {isOwner && submission.status === "REVISION_REQUESTED" && (
        <Card>
          <CardHeader><CardTitle>ส่งงานใหม่</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              อัปโหลดไฟล์ใหม่ผ่านหน้า{lessonId ? "บทเรียน" : "วิชา"} แล้วกดส่งงานใหม่
            </p>
            <Link href={lessonId ? `/courses/${slug}/lessons/${lessonId}` : `/courses/${slug}`}>
              <Button variant="outline">ไปหน้า{lessonId ? "บทเรียน" : "วิชา"}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>ความคิดเห็น ({visibleComments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleComments.map((c) => (
            <div key={c.id} className={`border-l-2 pl-4 ${(c as any).isInternal ? "border-yellow-400 bg-yellow-50" : "border-muted"}`}>
              <p className="text-sm font-medium">
                {c.author.fullName}
                <Badge variant="outline" className="ml-2 text-xs">{c.author.role}</Badge>
                {(c as any).isInternal && <Badge variant="secondary" className="ml-1 text-xs">ภายใน</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString("th-TH")}</p>
              <p className="mt-1 text-sm">{c.content}</p>
            </div>
          ))}

          <form
            action={async (formData: FormData) => {
              "use server";
              const content = formData.get("content") as string;
              if (content?.trim()) await addComment(submissionId, content, false);
            }}
            className="flex gap-2"
          >
            <Input name="content" placeholder="เพิ่มความคิดเห็น..." />
            <Button type="submit" size="sm">ส่ง</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
