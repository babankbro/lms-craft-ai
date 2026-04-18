"use client";

import { createPairing } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SimpleUser = { id: string; fullName: string };

interface Props {
  mentors: SimpleUser[];
  unpairedStudents: SimpleUser[];
}

export function PairingForm({ mentors, unpairedStudents }: Props) {
  return (
    <form action={createPairing} className="flex flex-wrap gap-4 items-end">
      <div className="space-y-1 w-56">
        <label className="text-sm font-medium">พี่เลี้ยง</label>
        <Select name="mentorId" required>
          <SelectTrigger>
            <SelectValue placeholder="เลือกพี่เลี้ยง" />
          </SelectTrigger>
          <SelectContent>
            {mentors.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 w-56">
        <label className="text-sm font-medium">นักเรียน (ยังไม่มีพี่เลี้ยง)</label>
        <Select name="studentId" required>
          <SelectTrigger>
            <SelectValue placeholder="เลือกนักเรียน" />
          </SelectTrigger>
          <SelectContent>
            {unpairedStudents.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit">จับคู่</Button>
    </form>
  );
}
