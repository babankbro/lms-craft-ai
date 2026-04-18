import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 3;

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: parseInt(process.env.SMTP_PORT ?? "1025"),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

interface EmailPayload {
  courseName?: string;
  studentName?: string;
  link?: string;
  [key: string]: string | undefined;
}

function renderEmail(templateKey: string, payload: EmailPayload): { subject: string; html: string } {
  switch (templateKey) {
    case "ENROLLMENT_REQUESTED":
      return {
        subject: `คำขอลงทะเบียน: ${payload.courseName ?? ""}`,
        html: `<p><strong>${payload.studentName ?? "นักเรียน"}</strong> ขอลงทะเบียนหลักสูตร <strong>${payload.courseName ?? ""}</strong></p>
               <p><a href="${payload.link ?? ""}">ดูคำขอ</a></p>`,
      };
    case "ENROLLMENT_APPROVED":
      return {
        subject: `อนุมัติการลงทะเบียน: ${payload.courseName ?? ""}`,
        html: `<p>คำขอลงทะเบียนหลักสูตร <strong>${payload.courseName ?? ""}</strong> ได้รับการอนุมัติแล้ว</p>
               <p><a href="${payload.link ?? ""}">เริ่มเรียน</a></p>`,
      };
    case "ENROLLMENT_REJECTED":
      return {
        subject: `ปฏิเสธการลงทะเบียน: ${payload.courseName ?? ""}`,
        html: `<p>คำขอลงทะเบียนหลักสูตร <strong>${payload.courseName ?? ""}</strong> ถูกปฏิเสธ</p>`,
      };
    default:
      return { subject: templateKey, html: JSON.stringify(payload) };
  }
}

export async function enqueueEmail(
  toUserId: string,
  templateKey: string,
  payload: EmailPayload
): Promise<void> {
  await (prisma as any).outboundEmail.create({
    data: {
      toUserId,
      templateKey,
      payloadJson: JSON.stringify(payload),
      status: "PENDING",
      attempts: 0,
    },
  });
}

export async function flushEmailQueue(): Promise<void> {
  const pending = await (prisma as any).outboundEmail.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { email: true, fullName: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  if (pending.length === 0) return;

  const transport = createTransport();
  const from = process.env.SMTP_FROM ?? "noreply@mini-lms.local";

  for (const record of pending) {
    let payload: EmailPayload = {};
    try {
      payload = JSON.parse(record.payloadJson);
    } catch {
      // malformed JSON — treat as empty
    }

    const { subject, html } = renderEmail(record.templateKey, payload);

    try {
      await transport.sendMail({ from, to: record.user.email, subject, html });
      await (prisma as any).outboundEmail.update({
        where: { id: record.id },
        data: { status: "SENT", sentAt: new Date(), attempts: record.attempts + 1 },
      });
    } catch {
      const newAttempts = record.attempts + 1;
      await (prisma as any).outboundEmail.update({
        where: { id: record.id },
        data: {
          attempts: newAttempts,
          status: newAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        },
      });
    }
  }
}
