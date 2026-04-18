import { z } from "zod";

// Env-overridable question count bounds
export const COURSE_QUIZ_MIN = parseInt(process.env.QUIZ_COURSE_MIN ?? "10", 10);
export const COURSE_QUIZ_MAX = parseInt(process.env.QUIZ_COURSE_MAX ?? "20", 10);
export const SECTION_QUIZ_MIN = parseInt(process.env.QUIZ_SECTION_MIN ?? "2", 10);
export const SECTION_QUIZ_MAX = parseInt(process.env.QUIZ_SECTION_MAX ?? "3", 10);

export const quizChoiceSchema = z.object({
  choiceText: z.string().min(1, "Choice text is required"),
  isCorrect: z.boolean(),
});

export const quizQuestionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  points: z.number().positive().default(1),
  order: z.number().int().nonnegative(),
  choices: z
    .array(quizChoiceSchema)
    .min(2, "Each question needs at least 2 choices")
    .max(6, "Maximum 6 choices per question")
    .refine((choices) => choices.some((c) => c.isCorrect), {
      message: "At least one choice must be marked correct",
    }),
});

export const courseQuizSchema = z.object({
  title: z.string().min(1),
  passingScore: z.number().min(0).max(100),
  maxAttempts: z.number().int().nonnegative().default(0),
  questions: z
    .array(quizQuestionSchema)
    .min(COURSE_QUIZ_MIN, `Course quiz needs at least ${COURSE_QUIZ_MIN} questions`)
    .max(COURSE_QUIZ_MAX, `Course quiz may have at most ${COURSE_QUIZ_MAX} questions`),
});

export const sectionQuizSchema = z.object({
  title: z.string().min(1),
  passingScore: z.number().min(0).max(100),
  maxAttempts: z.number().int().nonnegative().default(0),
  questions: z
    .array(quizQuestionSchema)
    .min(SECTION_QUIZ_MIN, `Section quiz needs at least ${SECTION_QUIZ_MIN} questions`)
    .max(SECTION_QUIZ_MAX, `Section quiz may have at most ${SECTION_QUIZ_MAX} questions`),
});

export type CourseQuizInput = z.infer<typeof courseQuizSchema>;
export type SectionQuizInput = z.infer<typeof sectionQuizSchema>;
