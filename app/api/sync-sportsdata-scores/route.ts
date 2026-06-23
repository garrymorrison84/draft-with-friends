import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Score synchronization is temporarily disabled.",
    },
    { status: 503 }
  );
}
