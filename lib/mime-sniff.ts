import { fileTypeFromBuffer } from "file-type";

const SNIFF_BYTES = 4100;

export async function sniffMime(buffer: Buffer | Uint8Array): Promise<string | undefined> {
  // Copy into a fresh Uint8Array to avoid byteOffset/byteLength issues with pooled Buffers
  const len = Math.min(buffer.byteLength, SNIFF_BYTES);
  const fresh = new Uint8Array(len);
  fresh.set(buffer instanceof Buffer ? buffer.subarray(0, len) : buffer.subarray(0, len));
  const result = await fileTypeFromBuffer(fresh);
  return result?.mime;
}
