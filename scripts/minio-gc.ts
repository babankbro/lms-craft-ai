/**
 * minio-gc.ts — delete S3 objects that have no matching DB reference.
 *
 * Run:  npx tsx scripts/minio-gc.ts [--dry-run]
 *
 * Requires the same DATABASE_URL + S3_* env vars as the app.
 * Will ONLY delete keys that start with known prefixes (covers/, lessons/,
 * assignments/, submissions/, videos/). It never touches the bucket root or
 * unknown prefixes.
 */
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET ?? "mini-lms-storage";
const DRY_RUN = process.argv.includes("--dry-run");

// Prefixes managed by the app — anything else is skipped
const MANAGED_PREFIXES = ["covers/", "lessons/", "assignments/", "submissions/", "videos/", "certificates/"];

async function buildLiveKeys(): Promise<Set<string>> {
  const [
    courseKeys,
    lessonAttachments,
    assignmentAttachments,
    submissionFiles,
    obsVideos,
    certificates,
  ] = await Promise.all([
    prisma.course.findMany({ where: { coverImageKey: { not: null as unknown as string } }, select: { coverImageKey: true } }),
    prisma.lessonAttachment.findMany({ select: { fileKey: true } }),
    prisma.assignmentAttachment.findMany({ select: { fileKey: true } }),
    prisma.submissionFile.findMany({ select: { fileKey: true } }),
    prisma.observationVideo.findMany({ select: { fileKey: true } }),
    prisma.certificate.findMany({ where: { fileKey: { not: null as unknown as string } }, select: { fileKey: true } }),
  ]);

  const live = new Set<string>();
  for (const r of courseKeys) if (r.coverImageKey) live.add(r.coverImageKey);
  for (const r of lessonAttachments) live.add(r.fileKey);
  for (const r of assignmentAttachments) live.add(r.fileKey);
  for (const r of submissionFiles) live.add(r.fileKey);
  for (const r of obsVideos) if (r.fileKey) live.add(r.fileKey);
  for (const r of certificates) if (r.fileKey) live.add(r.fileKey as string);

  return live;
}

async function listAllKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function deleteKeys(keys: string[]): Promise<void> {
  // S3 DeleteObjects accepts max 1000 per request
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: batch.map((k) => ({ Key: k })) },
      })
    );
  }
}

async function main() {
  console.log(`[minio-gc] mode=${DRY_RUN ? "DRY RUN" : "LIVE"} bucket=${BUCKET}`);

  const liveKeys = await buildLiveKeys();
  console.log(`[minio-gc] ${liveKeys.size} referenced keys in DB`);

  const orphans: string[] = [];
  for (const prefix of MANAGED_PREFIXES) {
    const s3Keys = await listAllKeys(prefix);
    for (const key of s3Keys) {
      if (!liveKeys.has(key)) orphans.push(key);
    }
  }

  console.log(`[minio-gc] ${orphans.length} orphan object(s) found`);
  if (orphans.length === 0) {
    console.log("[minio-gc] nothing to do");
    return;
  }

  if (DRY_RUN) {
    for (const k of orphans) console.log(`  WOULD DELETE: ${k}`);
  } else {
    await deleteKeys(orphans);
    console.log(`[minio-gc] deleted ${orphans.length} object(s)`);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
