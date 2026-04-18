import { prisma } from "@/lib/prisma";
import { createUser, importUsersCSV, toggleUserActive } from "./actions";
import { MentorSelect } from "./_components/mentor-select";
import { RoleSelect } from "./_components/role-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, GraduationCap, BookOpen, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { q, role } = await searchParams;

  const allUsers = await prisma.user.findMany({
    include: {
      mentor: { select: { id: true, fullName: true } },
      mentees: { select: { id: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  // Stats
  const counts = {
    ADMIN: allUsers.filter((u) => u.role === "ADMIN").length,
    INSTRUCTOR: allUsers.filter((u) => u.role === "INSTRUCTOR").length,
    MENTOR: allUsers.filter((u) => u.role === "MENTOR").length,
    STUDENT: allUsers.filter((u) => u.role === "STUDENT").length,
  };

  // Filtered view
  const filtered = allUsers.filter((u) => {
    const matchQ = !q || u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase());
    const matchRole = !role || u.role === role;
    return matchQ && matchRole;
  });

  const mentors = allUsers.filter((u) => u.role === "MENTOR");
  const students = allUsers.filter((u) => u.role === "STUDENT");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "ผู้ดูแลระบบ", count: counts.ADMIN, icon: ShieldCheck, color: "text-purple-600" },
          { label: "ผู้สอน", count: counts.INSTRUCTOR, icon: BookOpen, color: "text-blue-600" },
          { label: "ครูพี่เลี้ยง", count: counts.MENTOR, icon: Users, color: "text-green-600" },
          { label: "ผู้เรียน", count: counts.STUDENT, icon: GraduationCap, color: "text-orange-600" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add User + CSV side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>เพิ่มผู้ใช้ใหม่</CardTitle></CardHeader>
          <CardContent>
            <form action={createUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                  <Input id="fullName" name="fullName" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="role">บทบาท</Label>
                  <select name="role" required className="w-full h-9 rounded border border-input bg-background px-2 text-sm">
                    <option value="">— เลือกบทบาท —</option>
                    <option value="STUDENT">ผู้เรียน</option>
                    <option value="MENTOR">ครูพี่เลี้ยง</option>
                    <option value="INSTRUCTOR">ผู้สอน</option>
                    <option value="ADMIN">ผู้ดูแลระบบ</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="groupName">กลุ่ม / โรงเรียน</Label>
                  <Input id="groupName" name="groupName" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm">เพิ่มผู้ใช้</Button>
                <span className="text-xs text-muted-foreground">รหัสผ่านเริ่มต้น: changeme123</span>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>นำเข้าจาก CSV</CardTitle></CardHeader>
          <CardContent>
            <form action={importUsersCSV} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="file">ไฟล์ CSV</Label>
                <Input id="file" name="file" type="file" accept=".csv" required />
              </div>
              <p className="text-xs text-muted-foreground">คอลัมน์: email, full_name, role, group_name</p>
              <Button type="submit" size="sm">นำเข้า</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* User list with search + role filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>รายชื่อผู้ใช้ทั้งหมด ({filtered.length})</CardTitle>
            <form method="GET" className="flex gap-2">
              <Input name="q" defaultValue={q ?? ""} placeholder="ค้นหาชื่อ / อีเมล" className="h-8 w-48 text-sm" />
              <select name="role" defaultValue={role ?? ""} className="h-8 rounded border border-input bg-background px-2 text-sm">
                <option value="">ทุกบทบาท</option>
                <option value="ADMIN">ผู้ดูแลระบบ</option>
                <option value="INSTRUCTOR">ผู้สอน</option>
                <option value="MENTOR">ครูพี่เลี้ยง</option>
                <option value="STUDENT">ผู้เรียน</option>
              </select>
              <Button type="submit" size="sm" variant="outline">ค้นหา</Button>
              {(q || role) && (
                <a href="/admin/users"><Button size="sm" variant="ghost" type="button">ล้าง</Button></a>
              )}
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>กลุ่ม</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>พี่เลี้ยง</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <RoleSelect userId={user.id} currentRole={user.role} />
                  </TableCell>
                  <TableCell className="text-sm">{user.groupName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "ใช้งาน" : "ระงับ"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.role === "STUDENT" ? (
                      <MentorSelect
                        studentId={user.id}
                        currentMentorId={user.mentorId ?? null}
                        mentors={mentors.map((m) => ({ id: m.id, fullName: m.fullName }))}
                      />
                    ) : user.role === "MENTOR" ? (
                      <span className="text-muted-foreground text-xs">{user.mentees?.length ?? 0} นักเรียน</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <form action={toggleUserActive.bind(null, user.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant={user.isActive ? "outline" : "default"}
                        className="text-xs h-7"
                      >
                        {user.isActive ? "ระงับ" : "เปิดใช้"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    ไม่พบผู้ใช้
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      {/* Student ↔ Mentor pairing quick view */}
      {students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ผู้เรียนที่ยังไม่มีครูพี่เลี้ยง ({students.filter((s) => !s.mentorId).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.filter((s) => !s.mentorId).map((student) => (
                <div key={student.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div>
                    <span className="font-medium text-sm">{student.fullName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{student.groupName ?? ""}</span>
                  </div>
                  <MentorSelect
                    studentId={student.id}
                    currentMentorId={null}
                    mentors={mentors.map((m) => ({ id: m.id, fullName: m.fullName }))}
                  />
                </div>
              ))}
              {students.filter((s) => !s.mentorId).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">ผู้เรียนทุกคนมีครูพี่เลี้ยงแล้ว ✓</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
