import type { PrismaClient } from "@/generated/prisma/client";

const DEFAULT_DISCLAIMER =
  "این پاسخ صرفاً اطلاعات عمومی حقوقی است و جایگزین مشاوره رسمی وکیل نیست.";

export interface RuntimeSettings {
  voiceEnabled: boolean;
  disclaimer: string;
}

function booleanFromJson(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringFromJson(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

export async function getRuntimeSettings(
  prisma: PrismaClient
): Promise<RuntimeSettings> {
  const fallbackVoice =
    process.env.FEATURE_VOICE !== "false" &&
    process.env.NEXT_PUBLIC_FEATURE_VOICE !== "false";
  const fallbackDisclaimer =
    process.env.LEGAL_DISCLAIMER ?? DEFAULT_DISCLAIMER;

  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["feature.voice", "legal.disclaimer"]
        }
      },
      select: {
        key: true,
        value: true
      }
    });

    const byKey = new Map(
      settings.map((setting) => [setting.key, setting.value])
    );

    return {
      voiceEnabled: booleanFromJson(
        byKey.get("feature.voice"),
        fallbackVoice
      ),
      disclaimer: stringFromJson(
        byKey.get("legal.disclaimer"),
        fallbackDisclaimer
      )
    };
  } catch {
    return {
      voiceEnabled: fallbackVoice,
      disclaimer: fallbackDisclaimer
    };
  }
}
