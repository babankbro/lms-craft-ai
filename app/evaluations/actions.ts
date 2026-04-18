"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, canReview } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const EvaluationRoundSchema = z.object({
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  maxScore: z.coerce.number().min(1).default(100),
});

export async function createEvaluationRound(formData: FormData) {
  await requireRole("ADMIN");

  const data = EvaluationRoundSchema.parse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    maxScore: formData.get("maxScore"),
  });

  await prisma.evaluationRound.create({
    data: {
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      maxScore: data.maxScore,
    },
  });

  revalidatePath("/admin/evaluations");
}

export async function submitEvaluation(
  roundId: number,
  evaluateeId: string,
  score: number,
  feedback?: string
) {
  const user = await requireAuth();
  if (!canReview(user.role)) throw new Error("Forbidden");

  await prisma.evaluation.upsert({
    where: {
      roundId_evaluatorId_evaluateeId: {
        roundId,
        evaluatorId: user.id,
        evaluateeId,
      },
    },
    create: {
      roundId,
      evaluatorId: user.id,
      evaluateeId,
      score,
      feedback,
    },
    update: {
      score,
      feedback,
    },
  });

  revalidatePath("/evaluations");
}

export async function submitSelfEvaluation(
  roundId: number,
  score: number,
  reflection?: string
) {
  const user = await requireAuth();

  await prisma.selfEvaluation.upsert({
    where: {
      roundId_userId: { roundId, userId: user.id },
    },
    create: {
      roundId,
      userId: user.id,
      score,
      reflection,
    },
    update: {
      score,
      reflection,
    },
  });

  revalidatePath("/evaluations");
}

export async function toggleEvaluationRound(roundId: number, isActive: boolean) {
  await requireRole("ADMIN");

  await prisma.evaluationRound.update({
    where: { id: roundId },
    data: { isActive },
  });

  revalidatePath("/admin/evaluations");
}
