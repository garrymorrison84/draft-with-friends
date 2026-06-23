import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      disabled: true,
      error:
        "Old SportsData sync endpoint is disabled. Use /api/scoring/test first.",
    },
    { status: 410 }
  );
}