-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "course_id" INTEGER,
ALTER COLUMN "lesson_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
