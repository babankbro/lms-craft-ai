import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { s3Client, BUCKET_NAME } from "@/lib/minio";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { resolveFileAccess } from "@/lib/attachment-visibility";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { key } = await params;
  const fileKey = key.join("/");
  const userId = session.user.id;
  const userRole = (session.user as { role: string }).role;

  const allowed = await resolveFileAccess(fileKey, userId, userRole);
  if (!allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ResponseContentDisposition: "inline",
  });

  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return NextResponse.redirect(presignedUrl);
}
