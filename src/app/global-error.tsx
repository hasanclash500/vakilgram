"use client";

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <main
          style={{
            maxWidth: 720,
            margin: "64px auto",
            padding: 24,
            fontFamily: "Tahoma, Arial, sans-serif",
            lineHeight: 1.9
          }}
        >
          <h1>خطای موقت در وکیل‌گرام</h1>
          <p>
            بارگذاری برنامه کامل نشد. جزئیات داخلی خطا نمایش داده نمی‌شود.
          </p>
          <button type="button" onClick={reset}>
            تلاش دوباره
          </button>
        </main>
      </body>
    </html>
  );
}
