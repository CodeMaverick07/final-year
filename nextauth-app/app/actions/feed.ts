"use server";

import { auth } from "@/auth";
import { getRecommendedFeed } from "@/lib/feed";

export async function fetchFeed(cursor?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const posts = await getRecommendedFeed(session.user.id, cursor);
  const nextCursor = cursor ? String(parseInt(cursor) + posts.length) : String(posts.length);

  return { posts, nextCursor: posts.length > 0 ? nextCursor : null };
}
