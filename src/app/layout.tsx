import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "وکیل‌گرام | دستیار حقوقی مستند",
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
