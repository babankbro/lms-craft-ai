import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { enrollInCourse, cancelEnrollment, getCourseProgress } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { QuizStateBadge } from "./_components/quiz-state-badge";
import { AssignmentPanel } from "./lessons/[lessonId]/_components/assignment-panel";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireAuth();
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true, sectionId: true } },
          sectionQuizzes: {
            include: { quiz: { select: { id: true, title: true, maxAttempts: true } } },
          },
        },
      },
      lessons: {
        where: { sectionId: null },
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true, sectionId: true },
      },
      enrollments: {
        where: { userId: user.id },
        select: { id: true, status: true, rejectReason: true },
      },
      preTestQuiz: { select: { id: true, title: true } },
      postTestQuiz: { select: { id: true, title: true } },
    },
  });

  if (!course) notFound();
  if (!course.isPublished && !canAuthor(user.role)) notFound();

  const enrollment = course.enrollments[0] ?? null;
  const enrollStatus = enrollment?.status ?? null;
  const isApproved = enrollStatus === "APPROVED";
  // Admin/Instructor/Mentor can view the full course page (lessons, quizzes)
  // without being enrolled — same view as an approved student.
  const isStaff = user.role === "ADMIN" || user.role === "INSTRUCTOR" || user.role === "MENTOR";
  const canViewAsEnrolled = isApproved || isStaff;
  const progress = isApproved ? await getCourseProgress(user.id, course.id) : 0;

  const completedIds = isApproved
    ? new Set(
        (await prisma.lessonProgress.findMany({
          where: { userId: user.id, lesson: { courseId: course.id }, isCompleted: true },
          select: { lessonId: true },
        })).map((lp) => lp.lessonId)
      )
    : new Set<number>();

  // All lessons (sectioned + unsectioned) for counting
  const allLessons = [
    ...course.sections.flatMap((s) => s.lessons),
    ...course.lessons,
  ];

  // Quiz attempt map: quizId -> best attempt info
  // Pre-Test gate: has the user submitted the pre-test?
  let preTestSubmitted = true; // default: no gate
  if (isApproved && course.preTestQuiz) {
    const preTestAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: course.preTestQuiz.id, studentId: user.id, isSubmitted: true },
      select: { id: true },
    });
    preTestSubmitted = !!preTestAttempt;
  }

  const quizAttemptMap = new Map<number, { isPassed: boolean | null; isSubmitted: boolean }>();
  if (isApproved) {
    const allQuizIds = [
      ...course.sections.flatMap((s) => s.sectionQuizzes.map((sq) => sq.quizId)),
      ...(course.preTestQuiz ? [course.preTestQuiz.id] : []),
      ...(course.postTestQuiz ? [course.postTestQuiz.id] : []),
    ];
    if (allQuizIds.length > 0) {
      const attempts = await prisma.quizAttempt.findMany({
        where: { studentId: user.id, quizId: { in: allQuizIds } },
        select: { quizId: true, isPassed: true, isSubmitted: true },
      });
      for (const a of attempts) {
        const existing = quizAttemptMap.get(a.quizId);
        if (!existing || (a.isPassed && !existing.isPassed)) {
          quizAttemptMap.set(a.quizId, { isPassed: a.isPassed, isSubmitted: a.isSubmitted });
        }
      }
    }
  }

  // Course-level assignments (lessonId = null) — only for enrolled students or staff
  const courseAssignmentsWithSubs = isApproved || isStaff
    ? await (async () => {
        const assignments = await prisma.assignment.findMany({
          where: { courseId: course.id, lessonId: null },
          include: { questions: { orderBy: { order: "asc" } } },
          orderBy: { createdAt: "asc" },
        });
        const subs = assignments.length > 0
          ? await prisma.submission.findMany({
              where: { assignmentId: { in: assignments.map((a) => a.id) }, studentId: user.id },
              include: {
                files: true,
                answers: { include: { files: true } },
              },
              orderBy: { updatedAt: "desc" },
            })
          : [];
        const subByAssignment = new Map(subs.map((s) => [s.assignmentId, s]));
        return assignments.map((a) => ({ assignment: a, submission: subByAssignment.get(a.id) ?? null }));
      })()
    : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          {course.description && (
            <p className="text-muted-foreground mt-1">{course.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {allLessons.length} บทเรียน
            {course.sections.length > 0 && ` · ${course.sections.length} หมวด`}
          </p>
        </div>
        {isApproved && (
          <div className="text-right">
            <Badge variant={progress === 100 ? "default" : "secondary"}>
              {progress === 100 ? "เรียนจบแล้ว" : `${progress}%`}
            </Badge>
            <Progress value={progress} className="w-32 mt-2" />
          </div>
        )}
      </div>

      {/* Enrollment action area — STUDENT only */}
      {user.role === "STUDENT" && (
        <div className="mb-6">
          {enrollStatus === null && (
            <form action={enrollInCourse.bind(null, course.id)}>
              <Button type="submit">ขอลงทะเบียน</Button>
            </form>
          )}
          {enrollStatus === "PENDING" && (
            <div className="flex items-center gap-3">
              <Badge variant="secondary">รออนุมัติ</Badge>
              <form action={cancelEnrollment.bind(null, course.id)}>
                <Button type="submit" variant="ghost" size="sm">ยกเลิกคำขอ</Button>
              </form>
            </div>
          )}
          {enrollStatus === "APPROVED" && (
            <Badge variant="default">ลงทะเบียนแล้ว</Badge>
          )}
          {(enrollStatus === "REJECTED" || enrollStatus === "CANCELLED") && (
            <div className="space-y-2">
              <Badge variant="destructive">
                {enrollStatus === "REJECTED" ? "ถูกปฏิเสธ" : "ยกเลิกแล้ว"}
              </Badge>
              {enrollment?.rejectReason && (
                <p className="text-sm text-muted-foreground">เหตุผล: {enrollment.rejectReason}</p>
              )}
              <form action={enrollInCourse.bind(null, course.id)}>
                <Button type="submit" variant="outline" size="sm">ขอลงทะเบียนใหม่</Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Pre-Test gate banner */}
      {isApproved && course.preTestQuiz && !preTestSubmitted && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">แบบทดสอบก่อนเรียน — ต้องทำก่อนเข้าเรียน</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">กรุณาทำแบบทดสอบก่อนเรียนให้เสร็จก่อน จึงจะสามารถเข้าถึงบทเรียนได้</p>
          </div>
          <Link
            href={`/courses/${course.slug}/quiz/${course.preTestQuiz.id}`}
            className="shrink-0"
          >
            <Button size="sm">เริ่มทำแบบทดสอบ</Button>
          </Link>
        </div>
      )}

      {/* Course-level Pre/Post Test badges */}
      {canViewAsEnrolled && (course.preTestQuiz || course.postTestQuiz) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {course.preTestQuiz && (
            <QuizStateBadge
              quizId={course.preTestQuiz.id}
              title={course.preTestQuiz.title}
              placement="BEFORE"
              attempt={quizAttemptMap.get(course.preTestQuiz.id)}
              href={`/courses/${course.slug}/quiz/${course.preTestQuiz.id}`}
            />
          )}
          {course.postTestQuiz && (
            <QuizStateBadge
              quizId={course.postTestQuiz.id}
              title={course.postTestQuiz.title}
              placement="AFTER"
              attempt={quizAttemptMap.get(course.postTestQuiz.id)}
              href={`/courses/${course.slug}/quiz/${course.postTestQuiz.id}`}
            />
          )}
        </div>
      )}

      {/* Lessons — sectioned */}
      <div className="space-y-6">
        {course.sections.map((section) => (
          <div key={section.id}>
            <div className="flex items-center justify-between border-b pb-1 mb-3">
              <h2 className="text-lg font-semibold text-foreground/80">{section.title}</h2>
              {canViewAsEnrolled && section.sectionQuizzes.length > 0 && (
                <div className="flex gap-1.5">
                  {section.sectionQuizzes
                    .sort((a, b) => a.placement.localeCompare(b.placement))
                    .map((sq) => (
                      <QuizStateBadge
                        key={sq.quizId}
                        quizId={sq.quizId}
                        title={sq.quiz.title}
                        placement={sq.placement as "BEFORE" | "AFTER"}
                        attempt={quizAttemptMap.get(sq.quizId)}
                        href={`/courses/${course.slug}/quiz/${sq.quizId}`}
                      />
                    ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {section.lessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  courseSlug={course.slug}
                  isApproved={canViewAsEnrolled}
                  isComplete={completedIds.has(lesson.id)}
                  isLocked={!preTestSubmitted && !isStaff}
                />
              ))}
              {section.lessons.length === 0 && (
                <p className="text-sm text-muted-foreground pl-2">ยังไม่มีบทเรียน</p>
              )}
            </div>
          </div>
        ))}

        {/* Unsectioned lessons */}
        {course.lessons.length > 0 && (
          <div>
            {course.sections.length > 0 && (
              <h2 className="text-lg font-semibold mb-3 text-foreground/80 border-b pb-1">บทเรียนทั่วไป</h2>
            )}
            <div className="space-y-2">
              {course.lessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  courseSlug={course.slug}
                  isApproved={canViewAsEnrolled}
                  isComplete={completedIds.has(lesson.id)}
                  isLocked={!preTestSubmitted && !isStaff}
                />
              ))}
            </div>
          </div>
        )}

        {allLessons.length === 0 && (
          <p className="text-center text-muted-foreground py-8">ยังไม่มีบทเรียน</p>
        )}
      </div>

      {/* Course-level assignments */}
      {courseAssignmentsWithSubs.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-1">งานระดับวิชา</h2>
          {courseAssignmentsWithSubs.map(({ assignment, submission }) => (
            <AssignmentPanel
              key={assignment.id}
              assignment={{
                ...assignment,
                questions: assignment.questions.map((q) => ({
                  ...q,
                  maxLength: q.maxLength ?? null,
                  maxFiles: q.maxFiles ?? null,
                })),
              }}
              submission={submission ? {
                ...submission,
                answers: submission.answers.map((a) => ({
                  questionId: a.questionId,
                  textAnswer: a.textAnswer,
                  files: a.files,
                })),
              } : null}
              courseSlug={course.slug}
              lessonId={null}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function LessonRow({
  lesson,
  courseSlug,
  isApproved,
  isComplete,
  isLocked = false,
}: {
  lesson: { id: number; title: string; order: number };
  courseSlug: string;
  isApproved: boolean;
  isComplete: boolean;
  isLocked?: boolean;
}) {
  const showLock = !isApproved || isLocked;
  const clickable = isApproved && !isLocked;
  return (
    <Card className={`transition-colors ${clickable ? "hover:bg-muted/30" : "opacity-70"}`}>
      <CardHeader className="py-3 px-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {showLock && <Lock className="w-3 h-3 text-muted-foreground" />}
            {clickable ? (
              <Link href={`/courses/${courseSlug}/lessons/${lesson.id}`} className="hover:underline">
                {lesson.order}. {lesson.title}
              </Link>
            ) : (
              <span className="text-muted-foreground">{lesson.order}. {lesson.title}</span>
            )}
          </CardTitle>
          {isComplete && <Badge variant="default" className="text-xs">เรียนจบ</Badge>}
        </div>
      </CardHeader>
    </Card>
  );
}
