import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { Backdrop } from "@/components/Backdrop";

const rubik = Rubik({ subsets: ["hebrew", "latin"], weight: ["400", "500", "700", "900"] });

export const metadata: Metadata = {
  title: "ערב זוגות",
  description: "משחקים, נקודות ועלבונות חביבים",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1033",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.className} antialiased`}>
        <Backdrop />
        <main className="mx-auto min-h-dvh max-w-md px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
