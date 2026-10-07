import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { getRuntimeSettings } from "@/lib/settings/runtime-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getRuntimeSettings(getPrisma());

  return NextResponse.json(
    {
      voiceEnabled: settings.voiceEnabled
    },
    {
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}
