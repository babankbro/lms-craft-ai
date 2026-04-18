import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { canAccessLesson } from "@/lib/course-gates";
import { markLessonComplete, getCourseProgress } from "@/app/courses/actions";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { YouTubePlayer } from "@/components/youtube-player";
import { CourseSidebar } from "../../_components/course-sidebar";
import { AssignmentPanel } from "./_components/assignment-panel";
import { QuizBanner } from "./_components/quiz-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  ClipboardList,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LessonViewerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const user = await requireAuth();
  const { slug, lessonId } = await params;

  type LessonNavItem = { id: number; title: string; order: number };
  type SectionNavItem = { id: number; title: string; order: number; lessons: LessonNavItem[] };
  type CourseQuizItem = { id: number; title: string; type: string; passingScore: number };
  type LessonQuizItem = { order: number; quiz: CourseQuizItem };
  type PassEntry = { isPassed: boolean; percentage: number | null };

  // ── Course + all lessons (for sidebar & prev/next) ──────────────────────
  const courseRaw = await prisma.course.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true, sectionId: true } },
        },
      },
      lessons: {
        where: { sectionId: null } as unknown as { id: number },
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true, sectionId: true },
      },
      enrollments: { where: { userId: user.id }, select: { id: true, status: true } },
    },
  });

  if (!courseRaw) notFound();
  if (!courseRaw.isPublished && !canAuthor(user.role)) notFound();

  // Cast sections/lessons — Prisma types are correct at runtime but stale in IDE
  const courseSections = courseRaw.sections as unknown as SectionNavItem[];
  const courseUnsectioned = courseRaw.lessons as unknown as LessonNavItem[];

  const enrollmentRecord = courseRaw.enrollments[0] as { id: number; status: string } | undefined;
  const enrolled = enrollmentRecord?.status === "APPROVED";
  if (!enrolled && user.role === "STUDENT") notFound();

  const currentLessonId = parseInt(lessonId);

  // Gate check: students must satisfy pre-test + section gates
  if (enrolled && user.role === "STUDENT") {
    const canAccess = await canAccessLesson(user.id, currentLessonId);
    if (!canAccess) {
      const { redirect } = await import("next/navigation");
      redirect(`/courses/${slug}`);
    }
  }

  // ── Course-level quizzes (isCourseGate) via raw query ────────────────────
  const courseQuizzes: CourseQuizItem[] = await prisma.$queryRaw`
    SELECT id, title, type::text as type, passing_score as "passingScore"
    FROM quizzes
    WHERE "courseId" = ${courseRaw.id} AND is_course_gate = true
    ORDER BY id ASC
  `;

  // ── Current lesson ──────────────────────────────────────────────────────
  const lessonRaw = await prisma.lesson.findUnique({
    where: { id: currentLessonId },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      assignments: {
        include: {
          questions: { orderBy: { order: "asc" } },
          submissions: {
            where: { studentId: user.id },
            include: {
              files: { select: { id: true, fileName: true, fileSize: true, fileKey: true, answerId: true } },
              answers: {
                select: {
                  questionId: true,
                  textAnswer: true,
                  files: { select: { id: true, fileName: true, fileSize: true, fileKey: true } },
                },
              },
            },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!lessonRaw || lessonRaw.courseId !== courseRaw.id) notFound();
  const lesson = lessonRaw;

  // ── Lesson quizzes via raw query ─────────────────────────────────────────
  type RawLessonQuizRow = { order: number; id: number; title: string; type: string; passingScore: number };
  const lessonQuizRows = await prisma.$queryRaw`
    SELECT lq.order, q.id, q.title, q.type::text as type, q.passing_score as "passingScore"
    FROM lesson_quizzes lq
    JOIN quizzes q ON q.id = lq.quiz_id
    WHERE lq.lesson_id = ${currentLessonId}
    ORDER BY lq.order ASC
  ` as RawLessonQuizRow[];
  const lessonQuizzes: LessonQuizItem[] = lessonQuizRows.map((r) => ({
    order: r.order,
    quiz: { id: r.id, title: r.title, type: r.type, passingScore: Number(r.passingScore) },
  }));

  // ── Completion & progress ────────────────────────────────────────────────
  const completedLessons = await prisma.lessonProgress.findMany({
    where: { userId: user.id, lesson: { courseId: courseRaw.id }, isCompleted: true },
    select: { lessonId: true },
  });
  const completedIds = new Set(completedLessons.map((lp) => lp.lessonId));
  const isComplete = completedIds.has(lesson.id);
  const progress = enrolled ? await getCourseProgress(user.id, courseRaw.id) : 0;

  // ── All lessons flat (for prev/next) ─────────────────────────────────────
  const allLessons: LessonNavItem[] = [
    ...courseSections.flatMap((s) => s.lessons),
    ...courseUnsectioned,
  ].sort((a, b) => a.order - b.order);

  const currentIdx = allLessons.findIndex((l) => l.id === currentLessonId);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  // ── Lesson quizzes pass status ────────────────────────────────────────────
  const lessonQuizIds = lessonQuizzes.map((lq) => lq.quiz.id);
  const lessonQuizAttempts = lessonQuizIds.length
    ? await prisma.quizAttempt.findMany({
        where: { quizId: { in: lessonQuizIds }, studentId: user.id, isSubmitted: true },
        orderBy: { attemptNo: "desc" },
        distinct: ["quizId"],
        select: { quizId: true, isPassed: true, percentage: true },
      })
    : [];
  const lessonQuizPassMap: Record<number, PassEntry> = Object.fromEntries(
    lessonQuizAttempts.map((a) => [a.quizId, { isPassed: a.isPassed ?? false, percentage: a.percentage }])
  );

  // ── Course-level quiz pass status ─────────────────────────────────────────
  const courseQuizIds = courseQuizzes.map((q) => q.id);
  const courseQuizAttempts = courseQuizIds.length
    ? await prisma.quizAttempt.findMany({
        where: { quizId: { in: courseQuizIds }, studentId: user.id, isSubmitted: true },
        orderBy: { attemptNo: "desc" },
        distinct: ["quizId"],
        select: { quizId: true, isPassed: true, percentage: true },
      })
    : [];
  const courseQuizPassMap: Record<number, PassEntry> = Object.fromEntries(
    courseQuizAttempts.map((a) => [a.quizId, { isPassed: a.isPassed ?? false, percentage: a.percentage }])
  );

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const preQuizzes = lessonQuizzes.filter((lq) => lq.quiz.type === "PRE_TEST");
  const postQuizzes = lessonQuizzes.filter((lq) => lq.quiz.type !== "PRE_TEST");
  const coursePreTests = courseQuizzes.filter((q) => q.type === "PRE_TEST");
  const coursePostTests = courseQuizzes.filter((q) => q.type === "POST_TEST");

  // Course object for sidebar/breadcrumb
  const course = courseRaw;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* ── Left sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-muted/20">
        <div className="p-4 border-b">
          <Link
            href={`/courses/${course.slug}`}
            className="text-sm font-semibold hover:underline line-clamp-2 leading-snug block"
          >
            {course.title}
          </Link>
          {enrolled && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>ความคืบหน้า</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <CourseSidebar
            courseSlug={course.slug}
            sections={courseSections}
            unsectionedLessons={courseUnsectioned}
            currentLessonId={currentLessonId}
            completedIds={completedIds}
          />
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
            <Link href="/courses" className="hover:underline">คอร์สเรียน</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link href={`/courses/${course.slug}`} className="hover:underline">{course.title}</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-foreground font-medium">{lesson.title}</span>
          </nav>

          {/* Lesson header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold leading-tight">
                {lesson.order}. {lesson.title}
              </h1>
              {isComplete && (
                <Badge variant="default" className="shrink-0 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  เรียนจบแล้ว
                </Badge>
              )}
            </div>
            {lesson.estimatedMinutes && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>ประมาณ {lesson.estimatedMinutes} นาที</span>
              </div>
            )}
          </div>

          {/* Pre-lesson quizzes */}
          {enrolled && preQuizzes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ทำก่อนเรียน
              </p>
              {preQuizzes.map((lq) => (
                <QuizBanner
                  key={lq.quiz.id}
                  quizId={lq.quiz.id}
                  title={lq.quiz.title}
                  type={lq.quiz.type}
                  passingScore={lq.quiz.passingScore}
                  courseSlug={slug}
                  passStatus={{
                    attempted: !!lessonQuizPassMap[lq.quiz.id],
                    isPassed: lessonQuizPassMap[lq.quiz.id]?.isPassed ?? false,
                    percentage: lessonQuizPassMap[lq.quiz.id]?.percentage ?? null,
                  }}
                />
              ))}
              <Separator />
            </div>
          )}

          {/* Video */}
          {lesson.youtubeUrl && (
            <YouTubePlayer url={lesson.youtubeUrl} title={lesson.title} />
          )}

          {/* Lesson content */}
          <MarkdownRenderer content={lesson.content} />

          {/* Attachments */}
          {lesson.attachments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ไฟล์แนบ
              </h2>
              <ul className="space-y-2">
                {lesson.attachments.map((att) => (
                  <li key={att.id}>
                    <a
                      href={`/api/files/${att.fileKey}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium truncate group-hover:underline">
                          {att.fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</span>
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Post-lesson quizzes */}
          {enrolled && postQuizzes.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ทดสอบหลังเรียน
              </p>
              {postQuizzes.map((lq) => (
                <QuizBanner
                  key={lq.quiz.id}
                  quizId={lq.quiz.id}
                  title={lq.quiz.title}
                  type={lq.quiz.type}
                  passingScore={lq.quiz.passingScore}
                  courseSlug={slug}
                  passStatus={{
                    attempted: !!lessonQuizPassMap[lq.quiz.id],
                    isPassed: lessonQuizPassMap[lq.quiz.id]?.isPassed ?? false,
                    percentage: lessonQuizPassMap[lq.quiz.id]?.percentage ?? null,
                  }}
                />
              ))}
            </div>
          )}

          {/* Assignments */}
          {enrolled && lesson.assignments.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <h2 className="text-base font-semibold">งานมอบหมาย</h2>
              {lesson.assignments.map((assignment) => (
                <AssignmentPanel
                  key={assignment.id}
                  assignment={{
                    ...assignment,
                    questions: (assignment as any).questions ?? [],
                  }}
                  submission={
                    assignment.submissions[0]
                      ? {
                          ...assignment.submissions[0],
                          answers: (assignment.submissions[0] as any).answers ?? [],
                        }
                      : null
                  }
                  courseSlug={slug}
                  lessonId={currentLessonId}
                />
              ))}
            </div>
          )}

          {/* Mark complete + prev/next nav */}
          <Separator />
          <div className="flex items-center justify-between gap-4 pb-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={!prevLesson ? "invisible" : ""}
            >
              <Link href={`/courses/${slug}/lessons/${prevLesson?.id}`}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                ก่อนหน้า
              </Link>
            </Button>

            {enrolled && !isComplete && (
              <form action={markLessonComplete.bind(null, lesson.id)}>
                <Button type="submit" size="sm">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  ทำเสร็จแล้ว
                </Button>
              </form>
            )}

            <Button
              asChild
              variant="ghost"
              size="sm"
              className={!nextLesson ? "invisible" : ""}
            >
              <Link href={`/courses/${slug}/lessons/${nextLesson?.id}`}>
                ถัดไป
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* ── Right panel — Course quizzes ─────────────────────────────────── */}
      {enrolled && courseQuizzes.length > 0 && (
        <aside className="hidden lg:block w-64 shrink-0 border-l p-4 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5" />
            แบบทดสอบหลักสูตร
          </h3>

          {coursePreTests.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs text-muted-foreground">ก่อนเรียน</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {coursePreTests.map((q) => {
                  const ps = courseQuizPassMap[q.id];
                  return (
                    <Link
                      key={q.id}
                      href={`/courses/${slug}/quiz/${q.id}`}
                      className="block rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-xs font-medium line-clamp-2">{q.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">ผ่าน {q.passingScore}%</span>
                        {ps ? (
                          <Badge variant={ps.isPassed ? "default" : "destructive"} className="text-xs">
                            {ps.percentage?.toFixed(0)}%
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">ยังไม่ทำ</Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {coursePostTests.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs text-muted-foreground">หลังเรียน</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {coursePostTests.map((q) => {
                  const ps = courseQuizPassMap[q.id];
                  return (
                    <Link
                      key={q.id}
                      href={`/courses/${slug}/quiz/${q.id}`}
                      className="block rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-xs font-medium line-clamp-2">{q.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">ผ่าน {q.passingScore}%</span>
                        {ps ? (
                          <Badge variant={ps.isPassed ? "default" : "destructive"} className="text-xs">
                            {ps.percentage?.toFixed(0)}%
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">ยังไม่ทำ</Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </aside>
      )}
    </div>
  );
}
