import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;

  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${apiKey}`
  );

  const data = await response.json();

  return NextResponse.json({
    status: response.status,
    ok: response.ok,
    tournaments: data.slice(0, 10),
  });
}
