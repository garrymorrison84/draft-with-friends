import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SPORTSDATA_API_KEY;

  const response = await fetch(
    `https://api.sportsdata.io/golf/v2/json/Tournaments?key=${apiKey}`
  );

  const data = await response.json();

  const usOpen = data.filter(
    (t: any) =>
      t.Name?.toLowerCase().includes("u.s. open") ||
      t.Name?.toLowerCase().includes("us open")
  );

  return NextResponse.json(usOpen);
}
