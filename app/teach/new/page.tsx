import { createCourse } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewCoursePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">สร้างหลักสูตรใหม่</h1>
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลหลักสูตร</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCourse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">ชื่อหลักสูตร *</Label>
              <Input id="title" name="title" required placeholder="เช่น การสอนคณิตศาสตร์ชั้นประถม" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="อธิบายเนื้อหาและวัตถุประสงค์ของหลักสูตร"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">หมวดหมู่</Label>
                <Input id="category" name="category" placeholder="เช่น คณิตศาสตร์, วิทยาศาสตร์" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">ระดับ</Label>
                <Select name="level">
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกระดับ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">เริ่มต้น</SelectItem>
                    <SelectItem value="INTERMEDIATE">กลาง</SelectItem>
                    <SelectItem value="ADVANCED">สูง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) — เว้นว่างให้ระบบสร้างให้อัตโนมัติ</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="เช่น math-primary-grade4"
                pattern="[a-z0-9\u0E00-\u0E7F-]+"
              />
            </div>
            <Button type="submit" className="w-full">สร้างหลักสูตร</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
