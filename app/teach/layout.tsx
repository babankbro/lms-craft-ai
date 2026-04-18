import { requireRole } from "@/lib/permissions";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TeachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("INSTRUCTOR", "ADMIN");

  return (
    <div className="min-h-screen">
      <div className="border-b bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/teach" className="font-semibold text-sm hover:underline">
            หลักสูตรของฉัน
          </Link>
          <Link href="/teach/new">
            <Button size="sm" variant="outline">+ สร้างหลักสูตร</Button>
          </Link>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  );
}
