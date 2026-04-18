import { requireAuth } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { submitEvaluation, submitSelfEvaluation } from "./actions";

export const dynamic = "force-dynamic";

export default async function EvaluationsPage() {
  const user = await requireAuth();

  const activeRounds = await prisma.evaluationRound.findMany({
    where: { isActive: true },
    orderBy: { startDate: "desc" },
    include: {
      evaluations: {
        where: { evaluatorId: user.id },
      },
      selfEvaluations: {
        where: { userId: user.id },
      },
    },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">การประเมิน</h1>

      {activeRounds.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          ไม่มีรอบประเมินที่เปิดอยู่
        </p>
      )}

      {activeRounds.map((round) => (
        <Card key={round.id} className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{round.name}</CardTitle>
              <Badge>
                {new Date(round.startDate).toLocaleDateString("th-TH")} –{" "}
                {new Date(round.endDate).toLocaleDateString("th-TH")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Self-evaluation form for STUDENT */}
            {user.role === "STUDENT" && (
              <div>
                <h3 className="font-medium mb-2">ประเมินตนเอง</h3>
                {round.selfEvaluations.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    ประเมินแล้ว — คะแนน: {round.selfEvaluations[0].score}/{round.maxScore}
                  </p>
                ) : (
                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      const score = parseFloat(formData.get("score") as string);
                      const reflection = (formData.get("reflection") as string) || undefined;
                      await submitSelfEvaluation(round.id, score, reflection);
                    }}
                    className="space-y-2"
                  >
                    <div className="flex gap-2 items-end">
                      <div>
                        <label className="text-sm">คะแนน (เต็ม {round.maxScore})</label>
                        <input
                          name="score"
                          type="number"
                          min={0}
                          max={round.maxScore}
                          step={0.5}
                          required
                          className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
                      >
                        ส่ง
                      </button>
                    </div>
                    <div>
                      <label className="text-sm">สะท้อนความคิด</label>
                      <textarea
                        name="reflection"
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Peer evaluation form for MENTOR/INSTRUCTOR/ADMIN */}
            {(user.role === "MENTOR" || user.role === "INSTRUCTOR" || user.role === "ADMIN") && (
              <div>
                <h3 className="font-medium mb-2">ประเมินผู้อื่น</h3>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    const evaluateeId = formData.get("evaluateeId") as string;
                    const score = parseFloat(formData.get("score") as string);
                    const feedback = (formData.get("feedback") as string) || undefined;
                    await submitEvaluation(round.id, evaluateeId, score, feedback);
                  }}
                  className="space-y-2"
                >
                  <div>
                    <label className="text-sm">เลือกผู้ถูกประเมิน</label>
                    <select
                      name="evaluateeId"
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">-- เลือก --</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div>
                      <label className="text-sm">คะแนน (เต็ม {round.maxScore})</label>
                      <input
                        name="score"
                        type="number"
                        min={0}
                        max={round.maxScore}
                        step={0.5}
                        required
                        className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
                    >
                      ส่ง
                    </button>
                  </div>
                  <div>
                    <label className="text-sm">ข้อเสนอแนะ</label>
                    <textarea
                      name="feedback"
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </form>

                {round.evaluations.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      ประเมินแล้ว {round.evaluations.length} คน
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
