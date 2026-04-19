-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "max_score" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "course_score_configs" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "lesson_quiz_weight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "section_quiz_weight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "lesson_assignment_weight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "course_assignment_weight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_score_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_score_configs_course_id_key" ON "course_score_configs"("course_id");

-- AddForeignKey
ALTER TABLE "course_score_configs" ADD CONSTRAINT "course_score_configs_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
