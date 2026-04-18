import { NextResponse } from "next/server";
import { flushEmailQueue } from "@/lib/mailer";

// Protected by a shared secret so only the cron service can call this.
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  await flushEmailQueue();
  return NextResponse.json({ ok: true });
}
