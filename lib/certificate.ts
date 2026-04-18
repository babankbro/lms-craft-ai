import { prisma } from "@/lib/prisma";
import { s3Client, BUCKET_NAME } from "@/lib/minio";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { isSectionComplete } from "@/lib/course-gates";

export async function checkCourseCompletion(
  userId: string,
  courseId: number
): Promise<{ isComplete: boolean; reason?: string }> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: { select: { id: true } },
      quizzes: { select: { id: true, type: true } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postTestQuiz: { select: { id: true } } as any,
    },
  });
  if (!course) return { isComplete: false, reason: "Course not found" };

  // 0. Enrollment must be APPROVED
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment || enrollment.status !== "APPROVED") {
    return { isComplete: false, reason: "Enrollment not approved" };
  }

  // 1. All lessons completed
  const totalLessons = course.lessons.length;
  if (totalLessons > 0) {
    const completedLessons = await prisma.lessonProgress.count({
      where: { userId, lesson: { courseId }, isCompleted: true },
    });
    if (completedLessons < totalLessons) {
      return { isComplete: false, reason: `${completedLessons}/${totalLessons} lessons completed` };
    }
  }

  // 2. Course Post-Test (via explicit FK) must be passed if set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postTestQuizId = (course as any).postTestQuiz?.id ?? null;
  if (postTestQuizId) {
    const passed = await prisma.quizAttempt.count({
      where: { quizId: postTestQuizId, studentId: userId, isPassed: true },
    });
    if (passed === 0) return { isComplete: false, reason: "Course Post-Test not passed" };
  } else {
    // Fallback: any POST_TEST quiz attached to the course must be passed
    const postTests = course.quizzes.filter((q: { id: number; type: string }) => q.type === "POST_TEST");
    for (const quiz of postTests) {
      const passed = await prisma.quizAttempt.count({
        where: { quizId: quiz.id, studentId: userId, isPassed: true },
      });
      if (passed === 0) return { isComplete: false, reason: "POST_TEST not passed" };
    }
  }

  // 3. All QUIZ-typed quizzes must have a passing attempt
  const regularQuizzes = course.quizzes.filter((q) => q.type === "QUIZ");
  for (const quiz of regularQuizzes) {
    const passed = await prisma.quizAttempt.count({
      where: { quizId: quiz.id, studentId: userId, isPassed: true },
    });
    if (passed === 0) return { isComplete: false, reason: `Quiz ${quiz.id} not passed` };
  }

  // 4. All section gate quizzes must be passed
  const sections = await prisma.courseSection.findMany({
    where: { courseId },
    select: { id: true },
  });
  for (const section of sections) {
    if (!(await isSectionComplete(userId, section.id))) {
      return { isComplete: false, reason: `Section ${section.id} not complete` };
    }
  }

  return { isComplete: true };
}

function generateCertificatePDF(fullName: string, courseName: string, date: string, certId: string): Buffer {
  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 842 595]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 300>>
stream
BT
/F1 24 Tf
200 450 Td
(Certificate of Completion) Tj
/F1 18 Tf
200 390 Td
(${fullName}) Tj
/F1 14 Tf
200 330 Td
(Course: ${courseName}) Tj
200 290 Td
(Date: ${date}) Tj
/F1 10 Tf
200 240 Td
(Verification: ${certId}) Tj
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

export async function maybeIssueCertificate(userId: string, courseId: number): Promise<boolean> {
  const { isComplete } = await checkCourseCompletion(userId, courseId);
  if (!isComplete) return false;

  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return false;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
  if (!user || !course) return false;

  const date = new Date().toLocaleDateString("th-TH-u-ca-buddhist", {
    year: "numeric", month: "long", day: "numeric",
  });
  const certId = `${userId}-${courseId}-${Date.now()}`;
  const pdfBuffer = generateCertificatePDF(user.fullName, course.title, date, certId);
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

  return true;
}
