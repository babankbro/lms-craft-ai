"use client";

import { changeUserRole } from "../actions";

export function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  return (
    <select
      defaultValue={currentRole}
      onChange={async (e) => {
        await changeUserRole(userId, e.target.value);
      }}
      className="h-7 rounded border border-input bg-background px-1 text-xs"
    >
      <option value="STUDENT">ผู้เรียน</option>
      <option value="MENTOR">ครูพี่เลี้ยง</option>
      <option value="INSTRUCTOR">ผู้สอน</option>
      <option value="ADMIN">ผู้ดูแลระบบ</option>
    </select>
  );
}
