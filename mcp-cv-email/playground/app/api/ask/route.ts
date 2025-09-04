import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const SERVER = process.env.SERVER_BASE_URL!;
  const body = await req.json();
  const r = await fetch(`${SERVER}/api/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
