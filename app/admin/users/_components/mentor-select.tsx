"use client";

import { assignMentor } from "../actions";

interface MentorOption {
  id: string;
  fullName: string;
}

export function MentorSelect({
  studentId,
  currentMentorId,
  mentors,
}: {
  studentId: string;
  currentMentorId: string | null;
  mentors: MentorOption[];
}) {
  return (
    <form>
      <select
        name="mentorId"
        defaultValue={currentMentorId ?? ""}
        onChange={async (e) => {
          const formData = new FormData();
          formData.set("mentorId", e.target.value);
          await assignMentor(studentId, e.target.value || null);
        }}
        className="h-8 rounded border border-input bg-background px-2 text-sm w-48"
      >
        <option value="">— ยังไม่มีพี่เลี้ยง —</option>
        {mentors.map((m) => (
          <option key={m.id} value={m.id}>
            {m.fullName}
          </option>
        ))}
      </select>
    </form>
  );
}
