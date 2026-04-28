import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRecommendedFeed } from "@/lib/feed";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;

  const posts = await getRecommendedFeed(session.user.id, cursor);
  const nextCursor = cursor
    ? String(parseInt(cursor) + posts.length)
    : String(posts.length);

  return NextResponse.json({
    posts,
    nextCursor: posts.length > 0 ? nextCursor : null,
  });
}
