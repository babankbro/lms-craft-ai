import { PrismaClient, UserRole, QuizPlacement } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  // ── Users ────────────────────────────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { email: "admin@ksu.ac.th" },
    update: {},
    create: {
      email: "admin@ksu.ac.th",
      passwordHash: hash,
      fullName: "ดร.สมชาย ผู้ดูแลระบบ",
      role: UserRole.ADMIN,
      groupName: "มหาวิทยาลัยกาฬสินธุ์",
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@ksu.ac.th" },
    update: {},
    create: {
      email: "instructor@ksu.ac.th",
      passwordHash: hash,
      fullName: "อ.วิภา ผู้สอน",
      role: UserRole.INSTRUCTOR,
      groupName: "มหาวิทยาลัยกาฬสินธุ์",
    },
  });

  const mentor1 = await prisma.user.upsert({
    where: { email: "mentor1@school.ac.th" },
    update: {},
    create: {
      email: "mentor1@school.ac.th",
      passwordHash: hash,
      fullName: "อาจารย์วิชัย ครูพี่เลี้ยง",
      role: UserRole.MENTOR,
      groupName: "โรงเรียนกาฬสินธุ์วิทยาลัย",
    },
  });

  const mentor2 = await prisma.user.upsert({
    where: { email: "mentor2@school.ac.th" },
    update: {},
    create: {
      email: "mentor2@school.ac.th",
      passwordHash: hash,
      fullName: "อาจารย์สมศรี ครูพี่เลี้ยง",
      role: UserRole.MENTOR,
      groupName: "โรงเรียนอนุกูลนารี",
    },
  });

  for (let i = 1; i <= 5; i++) {
    await prisma.user.upsert({
      where: { email: `student${i}@school.ac.th` },
      update: {},
      create: {
        email: `student${i}@school.ac.th`,
        passwordHash: hash,
        fullName: `ครู Student ${i}`,
        role: UserRole.STUDENT,
        groupName: "โรงเรียนกาฬสินธุ์วิทยาลัย",
        mentorId: mentor1.id,
      },
    });
  }

  for (let i = 6; i <= 10; i++) {
    await prisma.user.upsert({
      where: { email: `student${i}@school.ac.th` },
      update: {},
      create: {
        email: `student${i}@school.ac.th`,
        passwordHash: hash,
        fullName: `ครู Student ${i}`,
        role: UserRole.STUDENT,
        groupName: "โรงเรียนอนุกูลนารี",
        mentorId: mentor2.id,
      },
    });
  }

  // ── Demo course ──────────────────────────────────────────────────────────
  const existingCourse = await prisma.course.findUnique({
    where: { slug: "intro-to-teaching" },
    select: { id: true, preTestQuizId: true, postTestQuizId: true },
  });

  let courseId: number;

  if (!existingCourse) {
    const course = await prisma.course.create({
      data: {
        title: "ความรู้เบื้องต้นเกี่ยวกับการสอน",
        slug: "intro-to-teaching",
        description:
          "หลักสูตรนี้จะแนะนำหลักการพื้นฐานของการจัดการเรียนการสอนในศตวรรษที่ 21 เหมาะสำหรับครูทุกระดับที่ต้องการพัฒนาทักษะการสอนอย่างมีประสิทธิภาพ",
        isPublished: true,
        requiresApproval: true,
        authorId: instructor.id,
      },
    });
    courseId = course.id;

    // ── PRE_TEST (10Q, diagnostic) ──────────────────────────────────────────
    const preTest = await prisma.quiz.create({
      data: {
        title: "แบบทดสอบก่อนเรียน (PRE-TEST)",
        type: "PRE_TEST",
        isCourseGate: true,
        passingScore: 0,
        maxAttempts: 1,
        courseId,
        questions: {
          create: [
            { questionText: "คุณมีประสบการณ์การสอนมากน้อยเพียงใด?", points: 1, order: 1, choices: { create: [{ choiceText: "ไม่มีเลย", isCorrect: false }, { choiceText: "1–2 ปี", isCorrect: false }, { choiceText: "3–5 ปี", isCorrect: true }, { choiceText: "มากกว่า 5 ปี", isCorrect: false }] } },
            { questionText: "การเรียนรู้แบบ Active Learning หมายถึงอะไร?", points: 1, order: 2, choices: { create: [{ choiceText: "การสอนแบบบรรยายล้วน", isCorrect: false }, { choiceText: "การให้ผู้เรียนมีส่วนร่วมในกระบวนการเรียนรู้อย่างแข็งขัน", isCorrect: true }, { choiceText: "การท่องจำเนื้อหา", isCorrect: false }, { choiceText: "การสอบปลายภาค", isCorrect: false }] } },
            { questionText: "ทฤษฎีพหุปัญญา (Multiple Intelligences) ถูกคิดค้นโดยใคร?", points: 1, order: 3, choices: { create: [{ choiceText: "Jean Piaget", isCorrect: false }, { choiceText: "Lev Vygotsky", isCorrect: false }, { choiceText: "Howard Gardner", isCorrect: true }, { choiceText: "John Dewey", isCorrect: false }] } },
            { questionText: "Zone of Proximal Development (ZPD) หมายถึงอะไร?", points: 1, order: 4, choices: { create: [{ choiceText: "ระดับที่นักเรียนทำได้คนเดียว", isCorrect: false }, { choiceText: "ช่องว่างระหว่างสิ่งที่นักเรียนทำได้คนเดียวกับสิ่งที่ทำได้เมื่อมีผู้ช่วยเหลือ", isCorrect: true }, { choiceText: "ระดับความรู้สูงสุดของนักเรียน", isCorrect: false }, { choiceText: "เขตปลอดภัยในห้องเรียน", isCorrect: false }] } },
            { questionText: "Bloom's Taxonomy ระดับสูงสุดคือ?", points: 1, order: 5, choices: { create: [{ choiceText: "ความเข้าใจ (Understanding)", isCorrect: false }, { choiceText: "การวิเคราะห์ (Analysis)", isCorrect: false }, { choiceText: "การประเมิน (Evaluation)", isCorrect: false }, { choiceText: "การสร้างสรรค์ (Creating)", isCorrect: true }] } },
            { questionText: "การสอนแบบ Constructivism เชื่อว่าการเรียนรู้เกิดจากอะไร?", points: 1, order: 6, choices: { create: [{ choiceText: "การถ่ายทอดความรู้จากครูสู่นักเรียน", isCorrect: false }, { choiceText: "การที่ผู้เรียนสร้างความรู้ขึ้นเองจากประสบการณ์", isCorrect: true }, { choiceText: "การท่องบ่นซ้ำๆ", isCorrect: false }, { choiceText: "การลอกเลียนแบบจากตัวอย่าง", isCorrect: false }] } },
            { questionText: "สิ่งใดสำคัญที่สุดในการออกแบบแผนการสอน?", points: 1, order: 7, choices: { create: [{ choiceText: "การเลือกตำราเรียน", isCorrect: false }, { choiceText: "การกำหนดผลลัพธ์การเรียนรู้ที่ชัดเจน", isCorrect: true }, { choiceText: "การเตรียมสื่อให้สวยงาม", isCorrect: false }, { choiceText: "จำนวนชั่วโมงสอน", isCorrect: false }] } },
            { questionText: "Formative Assessment คือการประเมินแบบใด?", points: 1, order: 8, choices: { create: [{ choiceText: "การสอบปลายภาค", isCorrect: false }, { choiceText: "การประเมินระหว่างการเรียนเพื่อปรับปรุงการสอน", isCorrect: true }, { choiceText: "การให้คะแนนชิ้นงาน", isCorrect: false }, { choiceText: "การสอบมาตรฐานแห่งชาติ", isCorrect: false }] } },
            { questionText: "ข้อใดเป็นตัวอย่างของ Differentiated Instruction?", points: 1, order: 9, choices: { create: [{ choiceText: "สอนเนื้อหาเดียวกันให้นักเรียนทุกคนพร้อมกัน", isCorrect: false }, { choiceText: "ปรับวิธีสอน เนื้อหา หรือผลลัพธ์ตามความต้องการของผู้เรียนแต่ละคน", isCorrect: true }, { choiceText: "ให้นักเรียนเก่งช่วยนักเรียนอ่อน", isCorrect: false }, { choiceText: "ใช้แบบทดสอบเดียวกันสำหรับทุกคน", isCorrect: false }] } },
            { questionText: "Metacognition หมายถึงอะไรในบริบทการศึกษา?", points: 1, order: 10, choices: { create: [{ choiceText: "การจดบันทึกระหว่างเรียน", isCorrect: false }, { choiceText: "ความสามารถในการคิดเกี่ยวกับกระบวนการคิดของตนเอง", isCorrect: true }, { choiceText: "การท่องจำข้อมูลได้มาก", isCorrect: false }, { choiceText: "การเรียนนอกห้องเรียน", isCorrect: false }] } },
          ],
        },
      },
    });

    // ── Section 1 ─────────────────────────────────────────────────────────
    const section1 = await prisma.courseSection.create({
      data: { courseId, title: "หมวดที่ 1: พื้นฐานการสอน", order: 10 },
    });

    const sec1PreQuiz = await prisma.quiz.create({
      data: {
        title: "ตรวจสอบความพร้อมก่อนเรียนหมวดที่ 1",
        type: "QUIZ", passingScore: 0, maxAttempts: 1, courseId,
        questions: {
          create: [
            { questionText: "คุณเคยใช้วิธีการสอนแบบ Active Learning หรือไม่?", points: 1, order: 1, choices: { create: [{ choiceText: "ใช้เป็นประจำ", isCorrect: true }, { choiceText: "ใช้บ้างเป็นครั้งคราว", isCorrect: false }, { choiceText: "ไม่เคยใช้เลย", isCorrect: false }, { choiceText: "ไม่แน่ใจว่าคืออะไร", isCorrect: false }] } },
            { questionText: "สิ่งที่คุณต้องการเรียนรู้มากที่สุดในหมวดนี้คืออะไร?", points: 1, order: 2, choices: { create: [{ choiceText: "เทคนิคการสอนใหม่ๆ", isCorrect: true }, { choiceText: "การบริหารจัดการห้องเรียน", isCorrect: false }, { choiceText: "การออกแบบแผนการสอน", isCorrect: false }, { choiceText: "การประเมินผล", isCorrect: false }] } },
          ],
        },
      },
    });

    const sec1PostQuiz = await prisma.quiz.create({
      data: {
        title: "แบบทดสอบหลังเรียนหมวดที่ 1",
        type: "QUIZ", passingScore: 60, courseId,
        questions: {
          create: [
            { questionText: "หลักการสอนที่มีประสิทธิภาพสูงสุดสำหรับศตวรรษที่ 21 คือข้อใด?", points: 1, order: 1, choices: { create: [{ choiceText: "การบรรยายล้วนโดยครูผู้เชี่ยวชาญ", isCorrect: false }, { choiceText: "การให้นักเรียนมีส่วนร่วมสร้างความรู้ด้วยตนเอง (Active Learning)", isCorrect: true }, { choiceText: "การท่องจำเนื้อหาจากตำรา", isCorrect: false }, { choiceText: "การทำแบบฝึกหัดซ้ำๆ", isCorrect: false }] } },
            { questionText: "จิตวิทยาการศึกษาช่วยครูได้อย่างไรมากที่สุด?", points: 1, order: 2, choices: { create: [{ choiceText: "ช่วยควบคุมพฤติกรรมนักเรียน", isCorrect: false }, { choiceText: "เข้าใจพัฒนาการและกระบวนการเรียนรู้ของผู้เรียนเพื่อออกแบบการสอนที่เหมาะสม", isCorrect: true }, { choiceText: "ช่วยให้ให้คะแนนได้ยุติธรรมขึ้น", isCorrect: false }, { choiceText: "ลดภาระงานของครู", isCorrect: false }] } },
          ],
        },
      },
    });

    await prisma.sectionQuiz.create({ data: { sectionId: section1.id, quizId: sec1PreQuiz.id, placement: QuizPlacement.BEFORE, isGate: false, order: 0 } });
    await prisma.sectionQuiz.create({ data: { sectionId: section1.id, quizId: sec1PostQuiz.id, placement: QuizPlacement.AFTER, isGate: true, order: 0 } });

    // Lessons in section 1
    const lesson1 = await prisma.lesson.create({
      data: {
        courseId, sectionId: section1.id, order: 10,
        title: "บทที่ 1: แนะนำหลักสูตรและหลักการสอนศตวรรษที่ 21",
        content: `# ยินดีต้อนรับสู่หลักสูตร\n\nหลักสูตรนี้ออกแบบมาเพื่อพัฒนาทักษะการสอนของคุณให้สอดคล้องกับบริบทการศึกษาในศตวรรษที่ 21\n\n## ทักษะสำคัญของครูยุคใหม่\n\n- **Critical Thinking** — ส่งเสริมการคิดวิเคราะห์\n- **Collaboration** — การทำงานร่วมกัน\n- **Communication** — การสื่อสารที่มีประสิทธิภาพ\n- **Creativity** — ความคิดสร้างสรรค์`,
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    });

    const lesson2 = await prisma.lesson.create({
      data: {
        courseId, sectionId: section1.id, order: 20,
        title: "บทที่ 2: จิตวิทยาการศึกษาและทฤษฎีการเรียนรู้",
        content: `# จิตวิทยาการศึกษา\n\n## ทฤษฎีสำคัญ\n\n### 1. Constructivism (เพียเจต์)\nผู้เรียนสร้างความรู้ขึ้นเองจากประสบการณ์\n\n### 2. Zone of Proximal Development (ไวก็อตสกี้)\nมีช่วง ZPD ที่ผู้เรียนสามารถพัฒนาได้เมื่อมีผู้ช่วยเหลือที่เหมาะสม\n\n### 3. Multiple Intelligences (การ์ดเนอร์)\nผู้เรียนแต่ละคนมีความถนัดต่างกัน`,
      },
    });

    // ── Section 2 ─────────────────────────────────────────────────────────
    const section2 = await prisma.courseSection.create({
      data: { courseId, title: "หมวดที่ 2: เทคนิคการสอนขั้นสูง", order: 20 },
    });

    const sec2PostQuiz = await prisma.quiz.create({
      data: {
        title: "แบบทดสอบหลังเรียนหมวดที่ 2",
        type: "QUIZ", passingScore: 60, courseId,
        questions: {
          create: [
            { questionText: "การสอนแบบ Differentiated Instruction หมายถึงอะไร?", points: 1, order: 1, choices: { create: [{ choiceText: "การสอนเนื้อหาแตกต่างกันสำหรับแต่ละห้องเรียน", isCorrect: false }, { choiceText: "การปรับวิธีสอน เนื้อหา และผลลัพธ์ตามความต้องการของผู้เรียนแต่ละคน", isCorrect: true }, { choiceText: "การแบ่งกลุ่มนักเรียนตามระดับสติปัญญา", isCorrect: false }, { choiceText: "การสอนเพิ่มเติมนอกเวลาเรียน", isCorrect: false }] } },
            { questionText: "Formative Assessment แตกต่างจาก Summative Assessment อย่างไร?", points: 1, order: 2, choices: { create: [{ choiceText: "Formative ใช้คะแนนตัดสินเกรด ส่วน Summative ไม่ใช้", isCorrect: false }, { choiceText: "Formative ประเมินระหว่างเรียนเพื่อปรับปรุง ส่วน Summative ประเมินเพื่อสรุปผลการเรียน", isCorrect: true }, { choiceText: "Formative ทำข้อสอบ ส่วน Summative ทำโปรเจกต์", isCorrect: false }, { choiceText: "ไม่มีความแตกต่าง", isCorrect: false }] } },
          ],
        },
      },
    });

    await prisma.sectionQuiz.create({ data: { sectionId: section2.id, quizId: sec2PostQuiz.id, placement: QuizPlacement.AFTER, isGate: true, order: 0 } });

    const lesson3 = await prisma.lesson.create({
      data: {
        courseId, sectionId: section2.id, order: 30,
        title: "บทที่ 3: เทคนิคการสอนและการจัดกิจกรรม",
        content: `# เทคนิคการสอนที่มีประสิทธิภาพ\n\n## 1. Think-Pair-Share\nให้นักเรียนคิดเดี่ยว → จับคู่อภิปราย → นำเสนอต่อชั้น\n\n## 2. Jigsaw Learning\nแบ่งกลุ่ม ให้แต่ละกลุ่มเชี่ยวชาญเนื้อหาต่างกัน แล้วสลับมาสอนกัน\n\n## 3. Problem-Based Learning (PBL)\nเริ่มจากปัญหาจริง ให้นักเรียนค้นหาและแก้ไขปัญหาร่วมกัน`,
      },
    });

    const lesson4 = await prisma.lesson.create({
      data: {
        courseId, sectionId: section2.id, order: 40,
        title: "บทที่ 4: การวัดและประเมินผลการเรียนรู้",
        content: `# การวัดและประเมินผล\n\n## Formative Assessment (ระหว่างเรียน)\n- คำถามปากเปล่า\n- Exit Ticket\n- Quiz สั้น\n\n## Summative Assessment (ปลายภาค)\n- การสอบ\n- โปรเจกต์\n- Portfolio`,
      },
    });

    // ── Section 3 ─────────────────────────────────────────────────────────
    const section3 = await prisma.courseSection.create({
      data: { courseId, title: "หมวดที่ 3: การออกแบบงานมอบหมาย", order: 30 },
    });

    const sec3Quiz = await prisma.quiz.create({
      data: {
        title: "แบบทดสอบหลังเรียนหมวดที่ 3",
        type: "QUIZ", passingScore: 70, courseId,
        questions: {
          create: [
            { questionText: "รูบริก (Rubric) ที่ดีควรมีองค์ประกอบใดบ้าง?", points: 1, order: 1, choices: { create: [{ choiceText: "เกณฑ์ที่ชัดเจน ระดับคุณภาพ และตัวอย่างประกอบ", isCorrect: true }, { choiceText: "คะแนนรวมและเปอร์เซ็นต์", isCorrect: false }, { choiceText: "ชื่อครูและวันที่ประเมิน", isCorrect: false }, { choiceText: "จำนวนข้อและเวลาที่ใช้", isCorrect: false }] } },
            { questionText: "งานมอบหมายที่ดีควรเน้นสิ่งใดมากที่สุด?", points: 1, order: 2, choices: { create: [{ choiceText: "ความถูกต้องของเนื้อหาวิชา", isCorrect: false }, { choiceText: "การนำความรู้ไปประยุกต์ใช้ในบริบทจริง", isCorrect: true }, { choiceText: "ความสวยงามของการนำเสนอ", isCorrect: false }, { choiceText: "ความยาวของงาน", isCorrect: false }] } },
            { questionText: "Peer Assessment มีประโยชน์อย่างไร?", points: 1, order: 3, choices: { create: [{ choiceText: "ลดภาระครูในการตรวจงาน", isCorrect: false }, { choiceText: "พัฒนาทักษะการประเมินและการคิดวิจารณ์ของผู้เรียน", isCorrect: true }, { choiceText: "ทำให้นักเรียนได้คะแนนสูงขึ้น", isCorrect: false }, { choiceText: "ประหยัดเวลาเรียน", isCorrect: false }] } },
          ],
        },
      },
    });

    await prisma.sectionQuiz.create({ data: { sectionId: section3.id, quizId: sec3Quiz.id, placement: QuizPlacement.AFTER, isGate: true, order: 0 } });

    const lesson5 = await prisma.lesson.create({
      data: {
        courseId, sectionId: section3.id, order: 50,
        title: "บทที่ 5: การออกแบบงานมอบหมายที่มีประสิทธิภาพ",
        content: `# การออกแบบงานมอบหมาย\n\n## หลักการออกแบบงานที่ดี\n\n1. **ชัดเจน** — นักเรียนรู้ว่าต้องทำอะไรและถูกประเมินด้านใด\n2. **สอดคล้อง** — ตรงกับวัตถุประสงค์การเรียนรู้\n3. **ท้าทาย** — ต้องการการคิดวิเคราะห์ ไม่ใช่แค่ท่องจำ\n4. **สมจริง** — สามารถทำได้จริงในเวลาที่กำหนด\n\n## ประเภทงานมอบหมาย\n\n- **งานเขียน** — รายงาน บทความ สะท้อนความคิด\n- **งานนำเสนอ** — Presentation, Poster\n- **งานปฏิบัติ** — สาธิต, โปรเจกต์\n- **Portfolio** — รวบรวมผลงานตลอดภาคเรียน`,
      },
    });

    const lesson6 = await prisma.lesson.create({
      data: {
        courseId, sectionId: section3.id, order: 60,
        title: "บทที่ 6: การสร้างรูบริกและการให้ Feedback",
        content: `# การสร้าง Rubric\n\n## ขั้นตอนการสร้าง Rubric\n\n1. กำหนดเกณฑ์การประเมิน (Criteria)\n2. กำหนดระดับคุณภาพ (ดีเยี่ยม / ดี / พอใช้ / ปรับปรุง)\n3. เขียนคำอธิบายแต่ละระดับให้ชัดเจน\n4. กำหนดน้ำหนักคะแนนของแต่ละเกณฑ์\n\n## การให้ Feedback ที่มีประสิทธิภาพ\n\n- **Specific** — ระบุสิ่งที่ดีและสิ่งที่ต้องปรับปรุงอย่างเจาะจง\n- **Timely** — ให้ฟีดแบ็กเร็วที่สุด ขณะที่ยังจำได้\n- **Actionable** — บอกว่าต้องทำอะไรเพื่อพัฒนา`,
      },
    });

    // ── POST_TEST ──────────────────────────────────────────────────────────
    const postTest = await prisma.quiz.create({
      data: {
        title: "แบบทดสอบหลังเรียน (POST-TEST)",
        type: "POST_TEST", isCourseGate: true, passingScore: 70, maxAttempts: 3, courseId,
        questions: {
          create: [
            { questionText: "ผลลัพธ์การเรียนรู้ที่ดีที่สุดวัดจากอะไร?", points: 1, order: 1, choices: { create: [{ choiceText: "คะแนนสอบสูงสุด", isCorrect: false }, { choiceText: "การนำความรู้ไปประยุกต์ใช้ในชีวิตจริงได้", isCorrect: true }, { choiceText: "จำนวนชั่วโมงที่เรียน", isCorrect: false }, { choiceText: "การส่งการบ้านครบ", isCorrect: false }] } },
            { questionText: "Active Learning แตกต่างจากการสอนแบบดั้งเดิมอย่างไร?", points: 1, order: 2, choices: { create: [{ choiceText: "ใช้เทคโนโลยีมากกว่า", isCorrect: false }, { choiceText: "ผู้เรียนมีบทบาทในการสร้างความรู้ ไม่ใช่รับข้อมูลฝ่ายเดียว", isCorrect: true }, { choiceText: "สนุกกว่า ไม่มีการสอบ", isCorrect: false }, { choiceText: "ครูพูดน้อยลง นักเรียนพูดมากขึ้น", isCorrect: false }] } },
            { questionText: "Bloom's Taxonomy ระดับที่ต้องการทักษะการคิดสูงสุดคือ?", points: 1, order: 3, choices: { create: [{ choiceText: "ความจำ (Remember)", isCorrect: false }, { choiceText: "การวิเคราะห์ (Analyze)", isCorrect: false }, { choiceText: "การสร้างสรรค์ (Create)", isCorrect: true }, { choiceText: "การนำไปใช้ (Apply)", isCorrect: false }] } },
            { questionText: "Scaffolding ในการสอนหมายถึงอะไร?", points: 1, order: 4, choices: { create: [{ choiceText: "การสร้างโครงสร้างห้องเรียน", isCorrect: false }, { choiceText: "การให้ความช่วยเหลือชั่วคราวที่ปรับลดลงเมื่อผู้เรียนสามารถทำได้เองมากขึ้น", isCorrect: true }, { choiceText: "การสอนทบทวนเนื้อหาก่อนสอบ", isCorrect: false }, { choiceText: "การแบ่งเนื้อหาเป็นส่วนย่อยๆ", isCorrect: false }] } },
            { questionText: "ข้อใดเป็นตัวอย่างที่ดีของ Formative Assessment?", points: 1, order: 5, choices: { create: [{ choiceText: "การสอบปลายภาคเรียน", isCorrect: false }, { choiceText: "Exit Ticket ที่นักเรียนเขียนสิ่งที่เรียนรู้ก่อนออกจากห้อง", isCorrect: true }, { choiceText: "Portfolio ตลอดปีการศึกษา", isCorrect: false }, { choiceText: "การสอบมาตรฐานแห่งชาติ", isCorrect: false }] } },
            { questionText: "Zone of Proximal Development (ZPD) บอกให้ครูทำอะไร?", points: 1, order: 6, choices: { create: [{ choiceText: "สอนในระดับที่นักเรียนทำได้สบายๆ แล้ว", isCorrect: false }, { choiceText: "สอนในระดับที่ยากเกินไปเพื่อท้าทาย", isCorrect: false }, { choiceText: "สอนในระดับที่นักเรียนยังทำไม่ได้คนเดียว แต่ทำได้เมื่อมีการสนับสนุน", isCorrect: true }, { choiceText: "สอนตามหลักสูตรที่กำหนดมาอย่างเคร่งครัด", isCorrect: false }] } },
            { questionText: "Differentiated Instruction เป็นประโยชน์อย่างไร?", points: 1, order: 7, choices: { create: [{ choiceText: "ช่วยให้ครูสอนง่ายขึ้น ใช้แผนเดียวสำหรับทุกคน", isCorrect: false }, { choiceText: "ตอบสนองความต้องการ ความสนใจ และระดับความพร้อมของผู้เรียนที่แตกต่างกัน", isCorrect: true }, { choiceText: "ลดเวลาเตรียมการสอน", isCorrect: false }, { choiceText: "ทำให้นักเรียนทุกคนได้คะแนนเท่ากัน", isCorrect: false }] } },
            { questionText: "Problem-Based Learning (PBL) เริ่มต้นจากอะไร?", points: 1, order: 8, choices: { create: [{ choiceText: "การอ่านตำราก่อนแล้วค่อยแก้ปัญหา", isCorrect: false }, { choiceText: "ปัญหาหรือสถานการณ์จริงที่ซับซ้อน ก่อนที่จะเรียนรู้เนื้อหา", isCorrect: true }, { choiceText: "การบรรยายของครูผู้เชี่ยวชาญ", isCorrect: false }, { choiceText: "การทดสอบก่อนเรียน", isCorrect: false }] } },
            { questionText: "Rubric ที่ดีควรมีองค์ประกอบสำคัญอะไร?", points: 1, order: 9, choices: { create: [{ choiceText: "คะแนนรวมและเปอร์เซ็นต์", isCorrect: false }, { choiceText: "เกณฑ์ที่ชัดเจน ระดับคุณภาพ และตัวอย่างประกอบ", isCorrect: true }, { choiceText: "ชื่อครูและวันที่ประเมิน", isCorrect: false }, { choiceText: "จำนวนข้อและเวลาที่ใช้", isCorrect: false }] } },
            { questionText: "Metacognition ช่วยผู้เรียนอย่างไรในกระบวนการเรียนรู้?", points: 1, order: 10, choices: { create: [{ choiceText: "ช่วยจดจำข้อมูลได้มากขึ้น", isCorrect: false }, { choiceText: "ช่วยให้รู้สึกมั่นใจในการสอบ", isCorrect: false }, { choiceText: "ช่วยให้ผู้เรียนตระหนัก ควบคุม และปรับปรุงกระบวนการคิดและการเรียนรู้ของตนเองได้", isCorrect: true }, { choiceText: "ช่วยให้เรียนเร็วขึ้น", isCorrect: false }] } },
          ],
        },
      },
    });

    await prisma.course.update({
      where: { id: courseId },
      data: { preTestQuizId: preTest.id, postTestQuizId: postTest.id },
    });

    // ── APPROVED enrollment for student1 ──────────────────────────────────
    const student1 = await prisma.user.findUnique({ where: { email: "student1@school.ac.th" } });
    if (student1) {
      const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: student1.id, courseId } },
      });
      if (!existing) {
        await prisma.enrollment.create({
          data: { userId: student1.id, courseId, status: "APPROVED", reviewedAt: new Date(), reviewedById: admin.id },
        });
      }
    }

    // Approve all remaining students for demo convenience
    for (let i = 2; i <= 5; i++) {
      const s = await prisma.user.findUnique({ where: { email: `student${i}@school.ac.th` } });
      if (s) {
        const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: s.id, courseId } } });
        if (!existing) {
          await prisma.enrollment.create({
            data: { userId: s.id, courseId, status: "APPROVED", reviewedAt: new Date(), reviewedById: admin.id },
          });
        }
      }
    }

    // Pending enrollment for student6
    const student6 = await prisma.user.findUnique({ where: { email: "student6@school.ac.th" } });
    if (student6) {
      const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: student6.id, courseId } } });
      if (!existing) {
        await prisma.enrollment.create({ data: { userId: student6.id, courseId, status: "PENDING" } });
      }
    }

    console.log(`✅ Created: course (id=${courseId}), 3 sections, 6 lessons, PRE_TEST (10Q), POST_TEST (10Q), section quizzes`);

    // ── Assignments on lessons ─────────────────────────────────────────────

    // Assignment 1 — Lesson 1 (Text + File questions)
    await (prisma.assignment as any).create({
      data: {
        lessonId: lesson1.id,
        title: "แผนการจัดการเรียนรู้ (Lesson Plan)",
        description: "จงออกแบบแผนการจัดการเรียนรู้สำหรับ 1 คาบเรียน (50 นาที) โดยประยุกต์ใช้หลักการสอนศตวรรษที่ 21",
        maxFileSize: 10 * 1024 * 1024,
        allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            { order: 1, prompt: "ระบุวิชาและระดับชั้นที่คุณวางแผนจะสอน พร้อมอธิบายบริบทของห้องเรียน", responseType: "TEXT", required: true, maxLength: 500 },
            { order: 2, prompt: "ระบุผลลัพธ์การเรียนรู้ (Learning Outcomes) อย่างน้อย 3 ข้อ ในรูปแบบ 'นักเรียนสามารถ...'", responseType: "TEXT", required: true, maxLength: 800 },
            { order: 3, prompt: "อธิบายกิจกรรมการเรียนรู้หลักที่คุณจะใช้ (เทคนิค Active Learning และขั้นตอนโดยย่อ)", responseType: "BOTH", required: true, maxLength: 1000 },
            { order: 4, prompt: "อัปโหลดไฟล์แผนการจัดการเรียนรู้ฉบับสมบูรณ์ (PDF หรือรูปภาพ)", responseType: "FILE", required: false },
          ],
        },
      },
    });

    // Assignment 2 — Lesson 2 (Reflection essay, text only)
    await (prisma.assignment as any).create({
      data: {
        lessonId: lesson2.id,
        title: "บทสะท้อนความคิด: ทฤษฎีการเรียนรู้กับการสอนของฉัน",
        description: "เขียนบทสะท้อนความคิดเกี่ยวกับการนำทฤษฎีการเรียนรู้ที่ศึกษามาประยุกต์ใช้ในห้องเรียนของคุณ",
        maxFileSize: 5 * 1024 * 1024,
        allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            { order: 1, prompt: "ทฤษฎีใดที่คุณคิดว่าสอดคล้องกับสไตล์การสอนของคุณมากที่สุด? เพราะเหตุใด?", responseType: "TEXT", required: true, maxLength: 600 },
            { order: 2, prompt: "ยกตัวอย่างสถานการณ์จริงในห้องเรียนที่คุณสังเกตเห็นหลักการ ZPD หรือ Scaffolding ทำงาน", responseType: "TEXT", required: true, maxLength: 800 },
            { order: 3, prompt: "คุณจะปรับเปลี่ยนวิธีการสอนอย่างไรหลังจากเรียนบทนี้?", responseType: "TEXT", required: true, maxLength: 600 },
          ],
        },
      },
    });

    // Assignment 3 — Lesson 3 (Observe and record with file evidence)
    await (prisma.assignment as any).create({
      data: {
        lessonId: lesson3.id,
        title: "บันทึกการสังเกตชั้นเรียน (Classroom Observation Log)",
        description: "บันทึกการสังเกตการณ์สอนของครูพี่เลี้ยงหรือเพื่อนร่วมงาน อย่างน้อย 1 ครั้ง ความยาวไม่น้อยกว่า 50 นาที",
        maxFileSize: 20 * 1024 * 1024,
        allowedTypes: ["application/pdf", "image/jpeg", "image/png", "video/mp4"],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            { order: 1, prompt: "ข้อมูลพื้นฐาน: ชื่อครูที่สังเกต / วิชา / ระดับชั้น / จำนวนนักเรียน / วันที่ / เวลา", responseType: "TEXT", required: true, maxLength: 300 },
            { order: 2, prompt: "สรุปเทคนิคการสอนที่ครูใช้ในชั้นเรียนนี้ ระบุอย่างน้อย 3 เทคนิค พร้อมตัวอย่างประกอบ", responseType: "TEXT", required: true, maxLength: 1000 },
            { order: 3, prompt: "อัปโหลดใบบันทึกการสังเกตชั้นเรียน (PDF) หรือรูปภาพประกอบ", responseType: "FILE", required: true },
            { order: 4, prompt: "สิ่งที่คุณจะนำไปพัฒนาการสอนของคุณเอง (Takeaway & Action Plan)", responseType: "BOTH", required: true, maxLength: 600 },
          ],
        },
      },
    });

    // Assignment 4 — Lesson 5 (Design rubric, file upload required)
    await (prisma.assignment as any).create({
      data: {
        lessonId: lesson5.id,
        title: "ออกแบบ Rubric สำหรับงานมอบหมายของคุณ",
        description: "ออกแบบ Rubric ที่สมบูรณ์สำหรับงานมอบหมาย 1 ชิ้นในวิชาที่คุณสอน ให้มีเกณฑ์ครอบคลุมทุกมิติที่สำคัญ",
        maxFileSize: 10 * 1024 * 1024,
        allowedTypes: ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            { order: 1, prompt: "อธิบายงานมอบหมายที่คุณออกแบบ Rubric สำหรับ (ชื่องาน วัตถุประสงค์ ระดับชั้น)", responseType: "TEXT", required: true, maxLength: 400 },
            { order: 2, prompt: "อัปโหลดไฟล์ Rubric ที่ออกแบบ (PDF, Word, หรือรูปภาพ)", responseType: "FILE", required: true },
            { order: 3, prompt: "สะท้อนความคิด: การออกแบบ Rubric นี้สอดคล้องกับวัตถุประสงค์การเรียนรู้อย่างไร?", responseType: "TEXT", required: true, maxLength: 500 },
          ],
        },
      },
    });

    // Assignment 5 — Lesson 6 (Portfolio-style, both text and multiple files)
    await (prisma.assignment as any).create({
      data: {
        lessonId: lesson6.id,
        title: "Portfolio: รวบรวมหลักฐานการพัฒนาวิชาชีพ",
        description: "รวบรวมหลักฐานแสดงพัฒนาการของคุณตลอดหลักสูตรนี้ ในรูปแบบ Mini Portfolio",
        maxFileSize: 50 * 1024 * 1024,
        allowedTypes: ["application/pdf", "image/jpeg", "image/png", "application/zip"],
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            { order: 1, prompt: "เขียนคำนำ: เป้าหมายการพัฒนาวิชาชีพของคุณเมื่อเริ่มหลักสูตรนี้คืออะไร?", responseType: "TEXT", required: true, maxLength: 500 },
            { order: 2, prompt: "อัปโหลดหลักฐาน 1: แผนการจัดการเรียนรู้ที่ดีที่สุดที่คุณสร้าง (PDF)", responseType: "FILE", required: true },
            { order: 3, prompt: "อัปโหลดหลักฐาน 2: บันทึกการสังเกตชั้นเรียนหรือวิดีโอสั้น (ไม่เกิน 5 นาที)", responseType: "FILE", required: true },
            { order: 4, prompt: "อัปโหลดหลักฐาน 3: Rubric ที่ออกแบบสำหรับงานของนักเรียน", responseType: "FILE", required: false },
            { order: 5, prompt: "เขียนสะท้อนความคิดสรุป: คุณพัฒนาขึ้นอย่างไรบ้างหลังจบหลักสูตรนี้?", responseType: "BOTH", required: true, maxLength: 1000 },
          ],
        },
      },
    });

    console.log("✅ Created 5 assignments across 5 lessons with varied question types");

    // ── Course-level assignments ───────────────────────────────────────────

    await (prisma.assignment as any).create({
      data: {
        courseId,
        lessonId: null,
        title: "งานสรุปการเรียนรู้ระดับวิชา (Final Reflection)",
        description: "สรุปและสะท้อนความคิดเกี่ยวกับการเรียนรู้ตลอดหลักสูตร พร้อมนำเสนอแผนพัฒนาตนเองในฐานะครูมืออาชีพ",
        maxFileSize: 20 * 1024 * 1024,
        allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            {
              order: 1,
              prompt: "สรุปความรู้และทักษะสำคัญที่ได้รับจากหลักสูตรนี้ (อย่างน้อย 5 ประเด็น)",
              responseType: "TEXT",
              required: true,
              maxLength: 1000,
            },
            {
              order: 2,
              prompt: "อธิบายวิธีที่คุณจะนำความรู้จากหลักสูตรไปประยุกต์ใช้ในห้องเรียนจริง พร้อมตัวอย่างแผนการสอน 1 แผน",
              responseType: "BOTH",
              required: true,
              maxLength: 1200,
            },
            {
              order: 3,
              prompt: "อัปโหลด Mini Portfolio: รวบรวมหลักฐานการพัฒนาตนเองตลอดหลักสูตร (PDF หรือรูปภาพ)",
              responseType: "FILE",
              required: false,
            },
            {
              order: 4,
              prompt: "เป้าหมายการพัฒนาวิชาชีพของคุณใน 6 เดือนข้างหน้าคืออะไร? (Professional Development Plan)",
              responseType: "TEXT",
              required: true,
              maxLength: 600,
            },
          ],
        },
      },
    });

    await (prisma.assignment as any).create({
      data: {
        courseId,
        lessonId: null,
        title: "แบบสอบถามความพึงพอใจและข้อเสนอแนะหลักสูตร",
        description: "ให้ข้อเสนอแนะเพื่อพัฒนาหลักสูตรนี้สำหรับรุ่นต่อไป ความคิดเห็นของคุณมีคุณค่ามากต่อการพัฒนาการศึกษา",
        maxFileSize: 5 * 1024 * 1024,
        allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        questions: {
          create: [
            {
              order: 1,
              prompt: "สิ่งที่คุณชอบมากที่สุดในหลักสูตรนี้คืออะไร? (เนื้อหา กิจกรรม สื่อการสอน ฯลฯ)",
              responseType: "TEXT",
              required: true,
              maxLength: 500,
            },
            {
              order: 2,
              prompt: "สิ่งที่ควรปรับปรุงหรือเพิ่มเติมในหลักสูตรนี้ เพื่อให้เป็นประโยชน์มากขึ้น",
              responseType: "TEXT",
              required: true,
              maxLength: 500,
            },
            {
              order: 3,
              prompt: "คุณจะแนะนำหลักสูตรนี้ให้เพื่อนครูคนอื่นหรือไม่? เพราะเหตุใด?",
              responseType: "TEXT",
              required: true,
              maxLength: 300,
            },
          ],
        },
      },
    });

    console.log("✅ Created 2 course-level assignments");
  } else {
    courseId = existingCourse.id;

    // Fix pre/post quiz IDs if missing
    let needsUpdate: { preTestQuizId?: number; postTestQuizId?: number } = {};
    if (!existingCourse.preTestQuizId) {
      const preTest = await prisma.quiz.findFirst({ where: { courseId, type: "PRE_TEST" }, select: { id: true } });
      if (preTest) needsUpdate.preTestQuizId = preTest.id;
    }
    if (!existingCourse.postTestQuizId) {
      const postTest = await prisma.quiz.findFirst({ where: { courseId, type: "POST_TEST" }, select: { id: true } });
      if (postTest) needsUpdate.postTestQuizId = postTest.id;
    }
    if (Object.keys(needsUpdate).length > 0) {
      await prisma.course.update({ where: { id: courseId }, data: needsUpdate });
      console.log("✅ Fixed pre/postTestQuizId binding on existing course");
    } else {
      console.log("✅ Course already fully seeded — skipping");
    }
  }

  // ── Mock Submissions (idempotent) ────────────────────────────────────────
  // Find the first assignment on lesson 1 (Lesson Plan assignment)
  const demoLesson = await prisma.lesson.findFirst({
    where: { course: { slug: "intro-to-teaching" }, order: 10 },
    select: { id: true },
  });

  if (demoLesson) {
    const assignment = await prisma.assignment.findFirst({
      where: { lessonId: demoLesson.id },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (assignment && assignment.questions.length >= 2) {
      const q1 = assignment.questions[0];
      const q2 = assignment.questions[1];

      // student1 — DRAFT with prefilled text answers (editable)
      const student1 = await prisma.user.findUnique({ where: { email: "student1@school.ac.th" } });
      if (student1) {
        const existing = await prisma.submission.findFirst({
          where: { assignmentId: assignment.id, studentId: student1.id },
        });
        if (!existing) {
          const sub = await prisma.submission.create({
            data: { assignmentId: assignment.id, studentId: student1.id, status: "DRAFT" },
          });
          await (prisma.submissionAnswer as any).create({
            data: {
              submissionId: sub.id,
              questionId: q1.id,
              textAnswer: "วิชาวิทยาศาสตร์ ชั้น ม.1 นักเรียน 35 คน ห้องเรียนมีโปรเจคเตอร์และอินเทอร์เน็ต นักเรียนมีความสนใจในเรื่องธรรมชาติแต่มีระดับความสามารถหลากหลาย",
            },
          });
          await (prisma.submissionAnswer as any).create({
            data: {
              submissionId: sub.id,
              questionId: q2.id,
              textAnswer: "นักเรียนสามารถ:\n1. อธิบายวัฏจักรของน้ำได้ครบถ้วน\n2. วิเคราะห์สาเหตุที่ทำให้เกิดฝนได้\n3. ออกแบบการทดลองอย่างง่ายเพื่อสาธิตการระเหยของน้ำได้",
            },
          });
          console.log(`✅ Created mock DRAFT submission for student1`);
        }
      }

      // student2 — DRAFT submission with partial answers
      const student2 = await prisma.user.findUnique({ where: { email: "student2@school.ac.th" } });
      if (student2) {
        const existing = await prisma.submission.findFirst({
          where: { assignmentId: assignment.id, studentId: student2.id },
        });
        if (!existing) {
          const sub = await prisma.submission.create({
            data: {
              assignmentId: assignment.id,
              studentId: student2.id,
              status: "DRAFT",
            },
          });
          await (prisma.submissionAnswer as any).create({
            data: {
              submissionId: sub.id,
              questionId: q1.id,
              textAnswer: "วิชาคณิตศาสตร์ ชั้น ป.6 นักเรียน 42 คน",
            },
          });
          console.log(`✅ Created mock DRAFT submission for student2`);
        }
      }

      // student3 — DRAFT with text answers (editable)
      const student3 = await prisma.user.findUnique({ where: { email: "student3@school.ac.th" } });
      if (student3) {
        const existing = await prisma.submission.findFirst({
          where: { assignmentId: assignment.id, studentId: student3.id },
        });
        if (!existing) {
          const sub = await prisma.submission.create({
            data: { assignmentId: assignment.id, studentId: student3.id, status: "DRAFT" },
          });
          await (prisma.submissionAnswer as any).create({
            data: {
              submissionId: sub.id,
              questionId: q1.id,
              textAnswer: "วิชาภาษาไทย ชั้น ม.2 นักเรียน 38 คน ห้องเรียนมีสื่อดิจิทัลครบครัน นักเรียนมีความสามารถในการอ่านแตกต่างกันมาก",
            },
          });
          await (prisma.submissionAnswer as any).create({
            data: {
              submissionId: sub.id,
              questionId: q2.id,
              textAnswer: "นักเรียนสามารถ:\n1. วิเคราะห์องค์ประกอบของบทกวีได้\n2. แต่งบทร้อยกรองอย่างง่ายได้\n3. นำเสนอผลงานและให้ Feedback เพื่อนได้",
            },
          });
          console.log(`✅ Created mock DRAFT submission for student3`);
        }
      }

      // student4 — DRAFT (editable, no prior feedback)
      const student4 = await prisma.user.findUnique({ where: { email: "student4@school.ac.th" } });
      if (student4) {
        const existing = await prisma.submission.findFirst({
          where: { assignmentId: assignment.id, studentId: student4.id },
        });
        if (!existing) {
          await prisma.submission.create({
            data: { assignmentId: assignment.id, studentId: student4.id, status: "DRAFT" },
          });
          console.log(`✅ Created mock DRAFT submission for student4`);
        }
      }
    }
  }

  // ── Mock Submissions for course-level assignment ─────────────────────────
  const courseAssignment = await prisma.assignment.findFirst({
    where: { course: { slug: "intro-to-teaching" }, lessonId: null },
    include: { questions: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  if (courseAssignment && courseAssignment.questions.length >= 2) {
    const cq1 = courseAssignment.questions[0];
    const cq2 = courseAssignment.questions[1];

    // student1 — DRAFT with pre-filled answers on course assignment
    const s1 = await prisma.user.findUnique({ where: { email: "student1@school.ac.th" } });
    if (s1) {
      const existing = await prisma.submission.findFirst({
        where: { assignmentId: courseAssignment.id, studentId: s1.id },
      });
      if (!existing) {
        const sub = await prisma.submission.create({
          data: { assignmentId: courseAssignment.id, studentId: s1.id, status: "DRAFT" },
        });
        await (prisma.submissionAnswer as any).create({
          data: {
            submissionId: sub.id,
            questionId: cq1.id,
            textAnswer: "1. หลักการ Active Learning และการออกแบบกิจกรรมที่ให้นักเรียนมีส่วนร่วม\n2. ทฤษฎี ZPD และการใช้ Scaffolding อย่างเหมาะสม\n3. การออกแบบ Rubric ที่ชัดเจนและยุติธรรม\n4. เทคนิค Differentiated Instruction เพื่อตอบสนองความหลากหลายในห้องเรียน\n5. การให้ Feedback ที่มีประสิทธิภาพและตรงเวลา",
          },
        });
        await (prisma.submissionAnswer as any).create({
          data: {
            submissionId: sub.id,
            questionId: cq2.id,
            textAnswer: "ฉันจะนำเทคนิค Think-Pair-Share มาใช้ในวิชาวิทยาศาสตร์ ม.1 โดยเริ่มต้นบทเรียนด้วยคำถามกระตุ้นความคิด ให้นักเรียนคิดคนเดียว 2 นาที จับคู่อภิปราย 3 นาที แล้วนำเสนอต่อชั้น แผนการสอนตัวอย่าง: หน่วยวัฏจักรน้ำ ชั้น ม.1 ใช้ภาพถ่ายเมฆและฝนเป็นสิ่งกระตุ้น",
          },
        });
        console.log("✅ Created mock DRAFT submission for student1 on course assignment");
      }
    }

    // student2 — DRAFT with partial answer on course assignment
    const s2 = await prisma.user.findUnique({ where: { email: "student2@school.ac.th" } });
    if (s2) {
      const existing = await prisma.submission.findFirst({
        where: { assignmentId: courseAssignment.id, studentId: s2.id },
      });
      if (!existing) {
        const sub = await prisma.submission.create({
          data: { assignmentId: courseAssignment.id, studentId: s2.id, status: "DRAFT" },
        });
        await (prisma.submissionAnswer as any).create({
          data: {
            submissionId: sub.id,
            questionId: cq1.id,
            textAnswer: "ได้เรียนรู้เทคนิค PBL และ Jigsaw Learning ซึ่งจะนำไปใช้ในวิชาคณิตศาสตร์ระดับประถมศึกษา",
          },
        });
        console.log("✅ Created mock DRAFT submission for student2 on course assignment");
      }
    }
  }

  console.log(
    "\nSeed complete:\n" +
    "  Users: 1 Admin · 1 Instructor · 2 Mentors · 10 Students\n" +
    "  Course: 'ความรู้เบื้องต้นเกี่ยวกับการสอน'\n" +
    "    ├─ PRE-TEST (10Q, diagnostic, course gate)\n" +
    "    ├─ Section 1: 2 lessons + section quiz (before+after)\n" +
    "    ├─ Section 2: 2 lessons + section quiz (after)\n" +
    "    ├─ Section 3: 2 lessons + section quiz (after)\n" +
    "    ├─ POST-TEST (10Q, 70% pass, course gate)\n" +
    "    ├─ 5 Lesson Assignments (TEXT / FILE / BOTH question types)\n" +
    "    └─ 2 Course-level Assignments (Final Reflection + Feedback Survey)\n" +
    "  Enrollments: students 1-5 APPROVED · student6 PENDING\n" +
    "  Mock Submissions: student1-4 DRAFT on lesson assign · student1-2 DRAFT on course assign"
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
