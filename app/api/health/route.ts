import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s3Client, BUCKET_NAME } from "@/lib/minio";
import { HeadBucketCommand } from "@aws-sdk/client-s3";

export async function GET() {
  const result: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.db = "ok";
  } catch {
    result.db = "error";
  }

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    result.minio = "ok";
  } catch {
    result.minio = "error";
  }

  const allOk = Object.values(result).every((v) => v === "ok");
  return NextResponse.json({ status: allOk ? "ok" : "degraded", ...result }, {
    status: allOk ? 200 : 503,
  });
}
