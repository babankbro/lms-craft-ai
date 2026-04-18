"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderLessons, deleteLesson } from "@/app/teach/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";

type Lesson = {
  id: number;
  title: string;
  order: number;
  sectionTitle?: string;
  attachmentCount: number;
  quizCount: number;
  courseId: number;
};

function SortableLesson({ lesson }: { lesson: Lesson }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2 px-3 rounded-md border bg-background hover:bg-muted/30 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 text-xs text-muted-foreground text-right shrink-0">{lesson.order}</span>
      <span className="flex-1 font-medium text-sm truncate">{lesson.title}</span>
      {lesson.sectionTitle && (
        <Badge variant="secondary" className="text-xs shrink-0">{lesson.sectionTitle}</Badge>
      )}
      <span className="text-xs text-muted-foreground shrink-0">{lesson.attachmentCount} ไฟล์</span>
      <span className="text-xs text-muted-foreground shrink-0">{lesson.quizCount} quiz</span>
      <div className="flex gap-2 shrink-0">
        <Link href={`/teach/${lesson.courseId}/lessons/${lesson.id}`} className="text-primary hover:underline text-sm">แก้ไข</Link>
        <form action={deleteLesson.bind(null, lesson.id)}>
          <button type="submit" className="text-destructive hover:underline text-sm">ลบ</button>
        </form>
      </div>
    </div>
  );
}

interface Props {
  courseId: number;
  lessons: Lesson[];
}

export function LessonListSortable({ courseId, lessons: initial }: Props) {
  const [lessons, setLessons] = useState(initial);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex).map((l, i) => ({
      ...l,
      order: i + 1,
    }));
    setLessons(reordered);

    setSaving(true);
    try {
      await reorderLessons(courseId, reordered.map((l) => l.id));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      {saving && (
        <p className="text-xs text-muted-foreground text-right">กำลังบันทึก...</p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {lessons.map((lesson) => (
            <SortableLesson key={lesson.id} lesson={lesson} />
          ))}
        </SortableContext>
      </DndContext>
      {lessons.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">
          ยังไม่มีบทเรียน — เพิ่มบทเรียนแรกเพื่อเริ่มต้น
        </p>
      )}
    </div>
  );
}
