import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true, email: true, fullName: true, role: true,
      groupName: true, isActive: true, createdAt: true,
    },
  });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const date = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const header = "id,email,fullName,role,groupName,isActive,createdAt";
    const rows = users.map((u) =>
      [u.id, u.email, `"${u.fullName}"`, u.role, u.groupName ?? "", u.isActive, u.createdAt.toISOString()].join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-${date}.csv"`,
      },
    });
  }

  return NextResponse.json(users);
}
