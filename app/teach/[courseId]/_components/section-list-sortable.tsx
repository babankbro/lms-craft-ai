"use client";

import { useState } from "react";
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
import { reorderSections, deleteSection } from "@/app/teach/[courseId]/sections/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";

type SectionQuiz = { quizId: number; placement: string; isGate: boolean; quiz: { title: string } };

type Section = {
  id: number;
  title: string;
  order: number;
  courseId: number;
  lessonCount: number;
  sectionQuizzes: SectionQuiz[];
};

function SortableSection({
  section,
  onDelete,
}: {
  section: Section;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

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
      <span className="flex-1 font-medium text-sm truncate">{section.title}</span>
      <span className="text-xs text-muted-foreground shrink-0">{section.lessonCount} บทเรียน</span>
      {section.sectionQuizzes.map((sq) => (
        <Badge
          key={sq.quizId}
          variant="outline"
          className={`text-xs shrink-0 ${
            sq.placement === "BEFORE"
              ? "border-amber-400 text-amber-700"
              : "border-green-400 text-green-700"
          }`}
        >
          {sq.placement === "BEFORE" ? "Pre" : "Post"}
        </Badge>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive h-7 text-xs shrink-0"
        onClick={() => onDelete(section.id)}
      >
        ลบ
      </Button>
    </div>
  );
}

interface Props {
  courseId: number;
  sections: Section[];
}

export function SectionListSortable({ courseId, sections: initial }: Props) {
  const [sections, setSections] = useState(initial);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);

    setSaving(true);
    try {
      await reorderSections(courseId, reordered.map((s) => s.id));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sectionId: number) {
    if (!confirm("ลบหมวดนี้? บทเรียนในหมวดจะถูกย้ายออกมา")) return;
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    await deleteSection(sectionId);
  }

  return (
    <div className="space-y-1">
      {saving && <p className="text-xs text-muted-foreground text-right">กำลังบันทึก...</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section) => (
            <SortableSection key={section.id} section={section} onDelete={handleDelete} />
          ))}
        </SortableContext>
      </DndContext>
      {sections.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          ยังไม่มีหมวด — เพิ่มหมวดเพื่อจัดกลุ่มบทเรียน
        </p>
      )}
    </div>
  );
}
