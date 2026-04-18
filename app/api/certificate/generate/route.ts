import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAuthor } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { checkCourseCompletion } from "@/lib/scoring";
import { s3Client, BUCKET_NAME } from "@/lib/minio";
import { PutObjectCommand } from "@aws-sdk/client-s3";

function generateCertificatePDF(
  fullName: string,
  courseName: string,
  date: string
): Buffer {
  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 842 595]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 200>>
stream
BT
/F1 24 Tf
200 400 Td
(Certificate of Completion) Tj
/F1 18 Tf
200 350 Td
(${fullName}) Tj
/F1 14 Tf
200 300 Td
(Course: ${courseName}) Tj
200 260 Td
(Date: ${date}) Tj
ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%EOF`;
  return Buffer.from(content);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role: string } | undefined)?.role ?? "";
  if (!session || !canAuthor(role as Parameters<typeof canAuthor>[0])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, courseId } = await request.json();

  const completion = await checkCourseCompletion(userId, courseId);
  if (!completion.isComplete) {
    return NextResponse.json(
      { error: "Course not completed", ...completion },
      { status: 400 }
    );
  }

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) {
    return NextResponse.json({ fileKey: existing.fileKey });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!user || !course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const date = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const pdfBuffer = generateCertificatePDF(user.fullName, course.title, date);
  const fileKey = `certificates/${userId}/${courseId}.pdf`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    })
  );

  await prisma.certificate.create({
    data: { userId, courseId, fileKey },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "CERTIFICATE_ISSUED",
      title: "ได้รับเกียรติบัตร",
      message: `คุณผ่านหลักสูตร "${course.title}" แล้ว`,
      link: "/certificates",
    },
  });

  return NextResponse.json({ fileKey });
}
