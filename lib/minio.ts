import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

export const BUCKET_NAME = process.env.MINIO_BUCKET || "mini-lms-storage";
export const PRESIGN_TTL = parseInt(process.env.FILE_PRESIGN_TTL_SECONDS || "900", 10);

export const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9002",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
});

/**
 * Delete all objects under a given prefix (e.g. "submissions/42/").
 * Batches in groups of 1000 (S3 API limit).
 */
export async function deleteByPrefix(prefix: string): Promise<void> {
  let continuationToken: string | undefined;
  do {
    const list = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    const objects = list.Contents?.map((o) => ({ Key: o.Key! })) ?? [];
    if (objects.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: { Objects: objects, Quiet: true },
        })
      );
    }
    continuationToken = list.NextContinuationToken;
  } while (continuationToken);
}
