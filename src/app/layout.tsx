import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "وکیل‌گرام | دستیار حقوقی مستند",
    template: "%s | وکیل‌گرام"
  },
  description:
    "دستیار حقوقی فارسی با پاسخ مستند به قوانین و مقررات و معرفی وکلا"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
