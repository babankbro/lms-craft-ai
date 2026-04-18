"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bulkApproveEnrollments, bulkRejectEnrollments } from "../actions";

interface Enrollment {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  groupName: string | null;
  requestedAt: Date;
  status: string;
}

export function BulkEnrollmentTable({ enrollments, courseId }: { enrollments: Enrollment[]; courseId: number }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rejectReason, setRejectReason] = useState("");
  const [pending, setPending] = useState(false);

  const allIds = enrollments.map((e) => e.id);
  const allChecked = selected.size === allIds.length && allIds.length > 0;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allIds));
  }

  async function handleApprove() {
    if (selected.size === 0) return;
    setPending(true);
    await bulkApproveEnrollments([...selected]);
    setSelected(new Set());
    setPending(false);
  }

  async function handleReject() {
    if (selected.size === 0) return;
    setPending(true);
    await bulkRejectEnrollments([...selected], rejectReason);
    setSelected(new Set());
    setRejectReason("");
    setPending(false);
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium">เลือก {selected.size} รายการ</span>
          <Button size="sm" onClick={handleApprove} disabled={pending}>อนุมัติทั้งหมด</Button>
          <div className="flex gap-2 items-center">
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="เหตุผลปฏิเสธ (ไม่จำเป็น)"
              className="h-8 w-44 text-xs"
            />
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={pending}>
              ปฏิเสธทั้งหมด
            </Button>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 pr-3 w-8">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="เลือกทั้งหมด" className="h-4 w-4 rounded border-gray-300" />
            </th>
            <th className="py-2 text-left font-medium">ชื่อ</th>
            <th className="py-2 text-left font-medium">อีเมล</th>
            <th className="py-2 text-left font-medium">กลุ่ม</th>
            <th className="py-2 text-left font-medium">วันที่ขอ</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => (
            <tr key={e.id} className={`border-b last:border-0 ${selected.has(e.id) ? "bg-muted/30" : ""}`}>
              <td className="py-2 pr-3">
                <input
                  type="checkbox"
                  checked={selected.has(e.id)}
                  onChange={() => toggle(e.id)}
                  aria-label={`เลือก ${e.userName}`}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </td>
              <td className="py-2 font-medium">{e.userName}</td>
              <td className="py-2">{e.userEmail}</td>
              <td className="py-2">{e.groupName ?? "—"}</td>
              <td className="py-2">{new Date(e.requestedAt).toLocaleDateString("th-TH")}</td>
            </tr>
          ))}
          {enrollments.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted-foreground">ไม่มีรายการ</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
