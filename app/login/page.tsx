"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, BadgeCheck, BookOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(49,104,96,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(199,171,101,0.18),transparent_26%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 lg:px-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-center">
            <div className="max-w-2xl space-y-6">
              <div className="inline-flex w-fit items-center rounded-full border border-border/70 bg-background/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
                DigiNest LMS
              </div>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                  ระบบนิเทศ กำกับ ติดตาม และหนุนเสริม
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  พื้นที่ทำงานกลางสำหรับผู้เรียน ครูพี่เลี้ยง ผู้สอน และผู้ดูแลระบบ
                  เพื่อขับเคลื่อนการเรียนรู้ การประเมิน และการติดตามผลในที่เดียว
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-border/70 bg-card/85 p-4 shadow-sm">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold">คอร์สและบทเรียน</p>
                  <p className="mt-1 text-sm text-muted-foreground">ติดตามความคืบหน้าและเข้าถึงเนื้อหาได้เป็นระบบ</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-card/85 p-4 shadow-sm">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold">งานและการประเมิน</p>
                  <p className="mt-1 text-sm text-muted-foreground">ส่งงาน ตรวจงาน และสรุปผลได้ในหน้าเดียว</p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-card/85 p-4 shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold">รองรับหลายบทบาท</p>
                  <p className="mt-1 text-sm text-muted-foreground">แยกประสบการณ์ตามสิทธิ์ของผู้ใช้แต่ละกลุ่ม</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center lg:justify-end">
            <Card className="w-full max-w-md border-white/60 bg-white/90">
              <CardHeader className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-primary">เข้าสู่ระบบ</p>
                  <CardTitle className="text-3xl">ยินดีต้อนรับกลับ</CardTitle>
                </div>
                <CardDescription>
                  ลงชื่อเข้าใช้เพื่อเข้าสู่พื้นที่เรียนรู้และการติดตามผลของคุณ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="email@example.com"
                      className="h-11 rounded-xl border-border/80 bg-background/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">รหัสผ่าน</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="h-11 rounded-xl border-border/80 bg-background/80"
                    />
                  </div>
                  {error && (
                    <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="group w-full" disabled={loading}>
                    {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
