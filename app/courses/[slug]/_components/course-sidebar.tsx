import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";

interface LessonItem {
  id: number;
  title: string;
  order: number;
}

interface SectionItem {
  id: number;
  title: string;
  order: number;
  lessons: LessonItem[];
}

interface CourseSidebarProps {
  courseSlug: string;
  /** Sections with their lessons (new API) */
  sections?: SectionItem[];
  /** Lessons not assigned to any section (new API) */
  unsectionedLessons?: LessonItem[];
  /** Legacy flat lessons list (old API) */
  lessons?: LessonItem[];
  currentLessonId?: number;
  completedIds: Set<number>;
  /** When false, lessons show lock icon instead of link */
  isEnrolled?: boolean;
}

function LessonLink({
  lesson,
  courseSlug,
  isActive,
  isComplete,
  isEnrolled = true,
}: {
  lesson: LessonItem;
  courseSlug: string;
  isActive: boolean;
  isComplete: boolean;
  isEnrolled?: boolean;
}) {
  const base = `flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors group`;
  const activeClass = isActive
    ? "bg-primary/10 text-primary font-medium"
    : "text-muted-foreground hover:bg-muted hover:text-foreground";

  const icon = isComplete ? (
    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
  ) : !isEnrolled ? (
    <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
  ) : (
    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
  );

  if (!isEnrolled) {
    return (
      <div className={`${base} ${activeClass} opacity-60 cursor-default`}>
        {icon}
        <span className="flex-1 truncate text-xs">{lesson.title}</span>
      </div>
    );
  }

  return (
    <Link
      href={`/courses/${courseSlug}/lessons/${lesson.id}`}
      className={`${base} ${activeClass}`}
    >
      {icon}
      <span className="flex-1 truncate text-xs">{lesson.title}</span>
    </Link>
  );
}

export function CourseSidebar({
  courseSlug,
  sections,
  unsectionedLessons,
  lessons,
  currentLessonId,
  completedIds,
  isEnrolled = true,
}: CourseSidebarProps) {
  // Support both new (sections + unsectionedLessons) and old (lessons) APIs
  const hasSections = sections && sections.length > 0;
  const flatLessons = lessons ?? unsectionedLessons ?? [];

  if (!hasSections && flatLessons.length === 0) {
    return <p className="text-xs text-muted-foreground px-2 py-4">ยังไม่มีบทเรียน</p>;
  }

  return (
    <div className="space-y-1">
      {/* Sectioned lessons */}
      {hasSections && sections!.map((section) => (
        <div key={section.id} className="mb-3">
          <p className="px-2 py-1 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide truncate">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.lessons.map((lesson) => (
              <LessonLink
                key={lesson.id}
                lesson={lesson}
                courseSlug={courseSlug}
                isActive={lesson.id === currentLessonId}
                isComplete={completedIds.has(lesson.id)}
                isEnrolled={isEnrolled}
              />
            ))}
            {section.lessons.length === 0 && (
              <p className="px-2 text-xs text-muted-foreground/50">ไม่มีบทเรียน</p>
            )}
          </div>
        </div>
      ))}

      {/* Unsectioned / flat lessons */}
      {flatLessons.length > 0 && (
        <div className={hasSections ? "mt-2" : ""}>
          {hasSections && (
            <p className="px-2 py-1 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide">
              ทั่วไป
            </p>
          )}
          <div className="space-y-0.5">
            {flatLessons.map((lesson) => (
              <LessonLink
                key={lesson.id}
                lesson={lesson}
                courseSlug={courseSlug}
                isActive={lesson.id === currentLessonId}
                isComplete={completedIds.has(lesson.id)}
                isEnrolled={isEnrolled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
