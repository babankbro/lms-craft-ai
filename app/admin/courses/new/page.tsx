import { requireRole } from "@/lib/permissions";
import { createCourse } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewCoursePage() {
  await requireRole("INSTRUCTOR", "ADMIN");

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">สร้างรายวิชาใหม่</h1>
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลวิชา</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCourse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">ชื่อวิชา *</Label>
              <Input
                id="title"
                name="title"
                required
                minLength={3}
                placeholder="เช่น หลักสูตรการสอนคณิตศาสตร์"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="คำอธิบายโดยย่อ"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Slug จะสร้างอัตโนมัติจากชื่อวิชา
            </p>
            <Button type="submit">สร้างวิชา</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
