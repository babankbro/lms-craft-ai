import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import { getStudentCourseScore, type ScoreBreakdown } from "@/lib/course-score";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

const COMPONENT_LABELS = {
  lessonQuiz:       "ทดสอบบทเรียน",
  sectionQuiz:      "ทดสอบหมวด",
  lessonAssignment: "งานบทเรียน",
  courseAssignment: "งานวิชา",
} as const;

function scoreColor(v: number | null): string {
  if (v === null) return "text-muted-foreground";
  if (v >= 70) return "text-green-600 font-semibold";
  if (v >= 50) return "text-amber-600 font-semibold";
  return "text-destructive font-semibold";
}

function CellValue({ c }: { c: ScoreBreakdown[keyof Omit<ScoreBreakdown, "finalScore" | "weightsConfigured">] }) {
  if (c.itemCount === 0) return <span className="text-muted-foreground">—</span>;
  if (c.score === null) return <span className="text-muted-foreground">— ({c.itemCount})</span>;
  return (
    <span>
      {c.score.toFixed(1)}
      <span className="text-xs text-muted-foreground ml-1">({c.itemCount})</span>
    </span>
  );
}

export default async function ScoreRosterPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireAuth();
  if (!canAuthor(user.role)) redirect("/dashboard");

  const { courseId: courseIdStr } = await params;
  const courseId = parseInt(courseIdStr);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, authorId: true },
  });
  if (!course) notFound();
  if (user.role !== "ADMIN" && course.authorId !== user.id) redirect("/teach");

  // Load config for the weight summary header
  const config = await prisma.courseScoreConfig.findUnique({
    where: { courseId },
  });

  // All approved enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: "APPROVED" },
    include: { user: { select: { id: true, fullName: true, email: true, groupName: true } } },
    orderBy: { user: { fullName: "asc" } },
  });

  // Compute score for each student (run concurrently)
  const rows = await Promise.all(
    enrollments.map(async (e) => {
      const breakdown = await getStudentCourseScore(e.user.id, courseId);
      return { user: e.user, breakdown };
    })
  );

  // Sort by finalScore desc (null last)
  rows.sort((a, b) => {
    const fa = a.breakdown.finalScore ?? -1;
    const fb = b.breakdown.finalScore ?? -1;
    return fb - fa;
  });

  const componentKeys = ["lessonQuiz", "sectionQuiz", "lessonAssignment", "courseAssignment"] as const;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href={`/teach/${courseId}`} className="text-sm text-muted-foreground hover:underline">
            ← กลับหน้าจัดการวิชา
          </Link>
          <h1 className="text-2xl font-bold mt-2">คะแนนนักเรียน</h1>
          <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/teach/${courseId}/score-config`}>
            <Button variant="outline" size="sm">กำหนดน้ำหนัก</Button>
          </Link>
          <a href={`/api/export/course-scores?courseId=${courseId}`}>
            <Button size="sm" variant="outline">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              ดาวน์โหลด CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Weight summary */}
      {config && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">น้ำหนัก:</span>
          {([
            ["lessonQuiz",       config.lessonQuizWeight],
            ["sectionQuiz",      config.sectionQuizWeight],
            ["lessonAssignment", config.lessonAssignmentWeight],
            ["courseAssignment", config.courseAssignmentWeight],
          ] as [string, number][]).map(([k, w]) => (
            <Badge key={k} variant="outline" className="text-xs font-normal">
              {COMPONENT_LABELS[k as keyof typeof COMPONENT_LABELS]} {w}%
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>นักเรียนที่ลงทะเบียน ({enrollments.length} คน)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">ชื่อ-นามสกุล</TableHead>
                <TableHead>กลุ่ม</TableHead>
                {componentKeys.map((k) => (
                  <TableHead key={k} className="text-center">
                    {COMPONENT_LABELS[k]}
                  </TableHead>
                ))}
                <TableHead className="text-center">รวม / 100</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ user: u, breakdown: bd }) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-4 font-medium">
                    <div>{u.fullName}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.groupName ?? "—"}
                  </TableCell>
                  {componentKeys.map((k) => (
                    <TableCell key={k} className="text-center text-sm">
                      <CellValue c={bd[k]} />
                    </TableCell>
                  ))}
                  <TableCell className={`text-center text-sm ${scoreColor(bd.finalScore)}`}>
                    {bd.finalScore != null ? bd.finalScore.toFixed(2) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    ยังไม่มีนักเรียนที่ได้รับอนุมัติ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> ≥ 70</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 50–69</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &lt; 50</span>
        <span>ตัวเลขในวงเล็บ = จำนวนรายการในหมวด</span>
      </div>
    </div>
  );
}
