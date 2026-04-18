import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAuthor } from "@/lib/permissions";
import { s3Client, BUCKET_NAME } from "@/lib/minio";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { sniffMime } from "@/lib/mime-sniff";

// Per-prefix config: [maxBytes, allowedMimeTypes, requiredRole]
const PREFIX_CONFIG: Record<
  string,
  { maxBytes: number; mimes: Set<string>; needsAuthor?: boolean; needsAnyAuth?: boolean }
> = {
  "lessons": {
    maxBytes: 25 * 1024 * 1024,
    mimes: new Set(["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","image/png","image/jpeg","text/plain","application/zip"]),
    needsAuthor: true,
  },
  "covers": {
    maxBytes: 5 * 1024 * 1024,
    mimes: new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]),
    needsAuthor: true,
  },
  "submissions": {
    maxBytes: 50 * 1024 * 1024,
    mimes: new Set(["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/png","image/jpeg","application/zip"]),
    needsAnyAuth: true,
  },
  "videos": {
    maxBytes: 500 * 1024 * 1024,
    mimes: new Set(["video/mp4", "video/webm", "video/quicktime"]),
    needsAnyAuth: true,
  },
  "assignments": {
    maxBytes: 25 * 1024 * 1024,
    mimes: new Set(["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","image/png","image/jpeg","text/plain","application/zip"]),
    needsAuthor: true,
  },
};

function getPrefixKey(prefix: string): string | null {
  const top = prefix.split("/")[0];
  return PREFIX_CONFIG[top] ? top : null;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const prefix = (formData.get("prefix") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const prefixKey = getPrefixKey(prefix);
  if (!prefixKey) {
    return NextResponse.json({ error: "BAD_PREFIX" }, { status: 400 });
  }

  const cfg = PREFIX_CONFIG[prefixKey];

  // Role check
  if (cfg.needsAuthor && !canAuthor(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  // needsAnyAuth already satisfied by session check above

  if (file.size > cfg.maxBytes) {
    return NextResponse.json({ error: "FILE_TOO_LARGE", maxBytes: cfg.maxBytes }, { status: 400 });
  }

  // Header MIME check against allow-list
  if (!cfg.mimes.has(file.type)) {
    return NextResponse.json({ error: "MIME_NOT_ALLOWED", allowed: [...cfg.mimes] }, { status: 415 });
  }

  const sanitized = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const uuid = randomUUID();
  const fileKey = `${prefix}/${uuid}_${sanitized}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Magic-byte MIME sniff — reject if detected type disagrees with the allow-list (P0-4)
  const detected = await sniffMime(buffer);
  if (detected !== undefined && !cfg.mimes.has(detected)) {
    return NextResponse.json(
      { error: "MIME_MISMATCH", detected, allowed: [...cfg.mimes] },
      { status: 415 }
    );
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
    })
  );

  return NextResponse.json({
    fileKey,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
}
