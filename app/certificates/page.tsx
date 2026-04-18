import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const user = await requireAuth();

  const certificates = await prisma.certificate.findMany({
    where: { userId: user.id },
    include: { course: { select: { title: true, slug: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">เกียรติบัตร</h1>
      {certificates.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          ยังไม่มีเกียรติบัตร
        </p>
      ) : (
        <div className="grid gap-4">
          {certificates.map((cert) => (
            <Card key={cert.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{cert.course.title}</CardTitle>
                  <Badge>ได้รับเกียรติบัตร</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ออกเมื่อ: {new Date(cert.issuedAt).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <a
                  href={`/api/files/${cert.fileKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm mt-2 inline-block"
                >
                  ดาวน์โหลดเกียรติบัตร
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
