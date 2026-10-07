const ARABIC_TO_PERSIAN: Record<string, string> = {
  "ي": "ی",
  "ى": "ی",
  "ك": "ک",
  "ة": "ه",
  "ۀ": "ه"
};

const DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"
};

export function normalizePersian(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[يىكةۀ]/g, (char) => ARABIC_TO_PERSIAN[char] ?? char)
    .replace(/[٠-٩۰-۹]/g, (char) => DIGITS[char] ?? char)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/\u200c+/g, "\u200c")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}
