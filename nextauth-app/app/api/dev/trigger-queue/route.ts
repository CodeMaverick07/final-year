import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const secret = process.env.CRON_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Set CRON_SECRET or AUTH_SECRET in .env to trigger the queue" },
      { status: 500 }
    );
  }
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/cron/process-queue`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  const data = await res.json();

  return NextResponse.json(data, { status: res.status });
}
