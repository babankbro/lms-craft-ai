import { requireRole } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("ADMIN");
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {children}
    </div>
  );
}
