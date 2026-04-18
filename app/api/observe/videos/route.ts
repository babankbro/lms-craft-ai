/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { title, description, youtubeUrl, courseId } = await request.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const video = await (prisma as any).observationVideo.create({
    data: {
      uploaderId: session.user.id,
      title,
      description: description || null,
      youtubeUrl: youtubeUrl || null,
      courseId: courseId || null,
    },
  });

  return NextResponse.json(video, { status: 201 });
}
