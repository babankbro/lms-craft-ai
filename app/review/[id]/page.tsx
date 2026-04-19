/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { requireAuth, canReview } from "@/lib/permissions";
import {
  claimReview,
  approveSubmission,
  requestRevision,
  releaseReview,
  addComment,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  if (!canReview(user.role)) redirect("/dashboard");
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: parseInt(id) },
    include: {
      student: { select: { fullName: true, email: true, mentorId: true } },
      assignment: {
        include: {
          lesson: { include: { course: { select: { authorId: true } } } },
          course: { select: { authorId: true } },
        },
      },
      files: true,
      answers: {
        include: {
          question: { select: { prompt: true, order: true, responseType: true } },
          files: { select: { id: true, fileName: true, fileKey: true, fileSize: true } },
        },
        orderBy: { question: { order: "asc" } },
      },
      comments: {
        include: { author: { select: { fullName: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!submission) notFound();

  // MENTOR: only own mentees
  if (user.role === "MENTOR" && submission.student.mentorId !== user.id) redirect("/review");
  // INSTRUCTOR: only own courses
  const courseAuthorId = submission.assignment.lesson?.course.authorId ?? submission.assignment.course?.authorId;
  if (user.role === "INSTRUCTOR" && courseAuthorId !== user.id) redirect("/review");

  const statusLabel: Record<string, string> = {
    DRAFT: "ร่าง",
    SUBMITTED: "ส่งแล้ว",
    UNDER_REVIEW: "กำลังตรวจ",
    REVISION_REQUESTED: "แก้ไข",
    APPROVED: "ผ่าน",
    REJECTED: "ไม่ผ่าน",
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ตรวจงาน</h1>
        <Badge>{statusLabel[submission.status] || submission.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลงาน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>นักเรียน:</strong> {submission.student.fullName} ({submission.student.email})</p>
          <p><strong>งาน:</strong> {submission.assignment.title}</p>
          <p><strong>ส่งเมื่อ:</strong> {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString("th-TH") : "—"}</p>
          {(submission as any).reviewCycle > 1 && (
            <p><strong>รอบที่:</strong> {(submission as any).reviewCycle}</p>
          )}
          {submission.score != null && (
            <p><strong>คะแนน:</strong> {submission.score}{submission.maxScore ? `/${submission.maxScore}` : ""}</p>
          )}
          {(submission as any).feedback && (
            <p><strong>ความเห็น:</strong> {(submission as any).feedback}</p>
          )}
        </CardContent>
      </Card>

      {/* Claim / Release */}
      {submission.status === "SUBMITTED" && (
        <form action={claimReview.bind(null, submission.id)}>
          <Button type="submit" variant="outline">รับตรวจงานนี้</Button>
        </form>
      )}
      {submission.status === "UNDER_REVIEW" && submission.reviewedBy === user.id && (
        <form action={releaseReview.bind(null, submission.id)}>
          <Button type="submit" variant="ghost" size="sm">คืนงาน</Button>
        </form>
      )}

      {/* Student answers per question */}
      {(submission as any).answers?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>คำตอบนักเรียน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(submission as any).answers.map((answer: any) => (
              <div key={answer.questionId} className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  {answer.question.order}. {answer.question.prompt}
                </p>
                {answer.textAnswer?.trim() ? (
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-2">{answer.textAnswer}</p>
                ) : answer.files?.length > 0 ? null : (
                  <p className="text-sm text-muted-foreground italic">ยังไม่ได้ตอบ</p>
                )}
                {answer.files?.length > 0 && (
                  <div className="space-y-1">
                    {answer.files.map((f: any) => (
                      <a
                        key={f.id}
                        href={`/api/files/preview/${f.fileKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        {f.fileName}
                        <span className="text-muted-foreground">({(f.fileSize / 1024).toFixed(1)} KB)</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ไฟล์ที่ส่ง ({submission.files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {submission.files.map((file) => (
            <div key={file.id} className="flex items-center gap-2 py-1">
              <a
                href={`/api/files/${file.fileKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {file.fileName}
              </a>
              <span className="text-xs text-muted-foreground">
                ({(file.fileSize / 1024).toFixed(1)} KB)
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Review Form */}
      {(submission.status === "SUBMITTED" || submission.status === "UNDER_REVIEW") && (
        <Card>
          <CardHeader>
            <CardTitle>ผลการตรวจ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Approve form */}
            <div className="border rounded-md p-4 space-y-3">
              <p className="text-sm font-medium text-green-700">อนุมัติ</p>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const score = parseFloat(formData.get("score") as string);
                  const feedback = formData.get("feedback") as string;
                  await approveSubmission(submission.id, score, feedback);
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="approve-score">คะแนน (0–100)</Label>
                    <Input id="approve-score" name="score" type="number" min={0} max={100} step={0.5} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="approve-feedback">ความเห็น *</Label>
                  <Textarea id="approve-feedback" name="feedback" rows={2} required />
                </div>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">ผ่าน</Button>
              </form>
            </div>

            {/* Request revision form */}
            <div className="border rounded-md p-4 space-y-3">
              <p className="text-sm font-medium text-orange-700">ขอให้แก้ไข</p>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const scoreStr = formData.get("score") as string;
                  const score = scoreStr ? parseFloat(scoreStr) : null;
                  const feedback = formData.get("feedback") as string;
                  await requestRevision(submission.id, score, feedback);
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rev-score">คะแนน (เป็นทางเลือก)</Label>
                    <Input id="rev-score" name="score" type="number" min={0} max={100} step={0.5} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rev-feedback">เหตุผลที่ต้องแก้ไข *</Label>
                  <Textarea id="rev-feedback" name="feedback" rows={2} required />
                </div>
                <Button type="submit" variant="outline" className="border-orange-400 text-orange-700">ขอให้แก้ไข</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>ความคิดเห็น ({submission.comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {submission.comments.map((comment) => (
            <div
              key={comment.id}
              className={`border-l-2 pl-4 ${
                (comment as any).isInternal ? "border-yellow-400 bg-yellow-50 rounded" : "border-muted"
              }`}
            >
              <div className="flex gap-2 items-center">
                <p className="text-sm font-medium">{comment.author.fullName}</p>
                <Badge variant="outline" className="text-xs">{comment.author.role}</Badge>
                {(comment as any).isInternal && (
                  <Badge variant="secondary" className="text-xs">ภายใน</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString("th-TH")}</p>
              <p className="mt-1 text-sm">{comment.content}</p>
            </div>
          ))}

          <form
            action={async (formData: FormData) => {
              "use server";
              const content = formData.get("commentContent") as string;
              const isInternal = formData.get("isInternal") === "true";
              if (content?.trim()) await addComment(submission.id, content, isInternal);
            }}
            className="space-y-2"
          >
            <Input name="commentContent" placeholder="เพิ่มความคิดเห็น..." />
            <div className="flex gap-3 items-center">
              <Button type="submit" size="sm">ส่ง</Button>
              {(user.role === "MENTOR" || user.role === "INSTRUCTOR" || user.role === "ADMIN") && (
                <label className="flex items-center gap-1 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" name="isInternal" value="true" className="accent-primary" />
                  เฉพาะผู้ตรวจ (ไม่แสดงแก่นักเรียน)
                </label>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
