import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">ไม่พบหน้าที่ต้องการ</p>
      <Link href="/" className="text-primary hover:underline">กลับหน้าหลัก</Link>
    </div>
  );
}
