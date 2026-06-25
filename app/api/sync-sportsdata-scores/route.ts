import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const syncUrl = new URL("/api/scoring/sync", request.url);

  const response = await fetch(syncUrl, {
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  return NextResponse.json(
    {
      ...data,
      proxiedFrom: "/api/sync-sportsdata-scores",
      proxiedTo: "/api/scoring/sync",
    },
    { status: response.status }
  );
}
