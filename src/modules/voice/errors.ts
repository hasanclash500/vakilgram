const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "دسترسی میکروفون داده نشده است. مجوز میکروفون مرورگر را بررسی کنید.",
  "service-not-allowed":
    "سرویس تشخیص گفتار در این مرورگر اجازه اجرا ندارد.",
  "no-speech":
    "صدایی تشخیص داده نشد. دوباره تلاش کنید و نزدیک‌تر به میکروفون صحبت کنید.",
  "audio-capture":
    "میکروفون قابل دسترسی نیست. اتصال یا تنظیمات ورودی صدا را بررسی کنید.",
  network:
    "سرویس تشخیص گفتار مرورگر به شبکه دسترسی ندارد.",
  aborted:
    "فرآیند شنیدن متوقف شد."
};

export function voiceRecognitionErrorMessage(code: string): string {
  return (
    ERROR_MESSAGES[code] ??
    "تشخیص صوت در این مرورگر با خطا روبه‌رو شد."
  );
}
