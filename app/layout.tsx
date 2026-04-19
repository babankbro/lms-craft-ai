import type { Metadata } from "next";
import { Prompt, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/shell/app-shell";

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบนิเทศ กำกับ ติดตาม และหนุนเสริม",
  description: "ระบบจัดการการฝึกอบรมครู CAT โดยครู CAM และนักวิจัย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${ibmPlexSansThai.variable}`} data-density="comfortable">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
