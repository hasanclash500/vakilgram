import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "vakilgram",
    phase: 1,
    voice: process.env.FEATURE_VOICE !== "false"
  });
}
