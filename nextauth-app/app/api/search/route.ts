import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchFeedContent } from "@/lib/feed";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  const data = await searchFeedContent(session.user.id, q);
  return NextResponse.json(data);
}
