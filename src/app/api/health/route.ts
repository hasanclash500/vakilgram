import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { getRuntimeSettings } from "@/lib/settings/runtime-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prisma = getPrisma();

    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.$queryRaw`SELECT 1 FROM "articles" LIMIT 1`,
      prisma.$queryRaw`SELECT 1 FROM "api_rate_limits" LIMIT 1`
    ]);

    const settings = await getRuntimeSettings(prisma);

    return NextResponse.json(
      {
        ok: true,
        service: "vakilgram",
        phase: 1,
        database: "ready",
        voice: settings.voiceEnabled
      },
      {
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "vakilgram",
        phase: 1,
        database: "unavailable"
      },
      {
        status: 503,
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  }
}
