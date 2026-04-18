import { requireAuth } from "@/lib/permissions";
import { StudentDashboard } from "./_components/student-dashboard";
import { MentorDashboard } from "./_components/mentor-dashboard";
import { InstructorDashboard } from "./_components/instructor-dashboard";
import { AdminDashboard } from "./_components/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();

  switch (user.role) {
    case "STUDENT":
      return <StudentDashboard userId={user.id} />;
    case "MENTOR":
      return <MentorDashboard userId={user.id} />;
    case "INSTRUCTOR":
      return <InstructorDashboard userId={user.id} />;
    case "ADMIN":
      return <AdminDashboard />;
    default:
      return <StudentDashboard userId={user.id} />;
  }
}
