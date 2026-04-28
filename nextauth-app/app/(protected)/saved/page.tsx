import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SavedClient from "./SavedClient";

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewerId = session.user.id;
  const followedIds = (
    await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    })
  ).map((x) => x.followingId);

  const [likedPosts, savedPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        likes: { some: { userId: viewerId } },
        OR: [
          { authorId: viewerId },
          { isPublic: true, author: { isPrivate: false } },
          { isPublic: true, authorId: { in: followedIds.length > 0 ? followedIds : ["__none__"] } },
        ],
      },
      include: {
        media: {
          orderBy: { order: "asc" },
          select: { type: true, url: true, mimeType: true },
        },
        manuscriptOcr: { select: { ocrStatus: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findMany({
      where: {
        bookmarks: { some: { userId: viewerId } },
        OR: [
          { authorId: viewerId },
          { isPublic: true, author: { isPrivate: false } },
          { isPublic: true, authorId: { in: followedIds.length > 0 ? followedIds : ["__none__"] } },
        ],
      },
      include: {
        media: {
          orderBy: { order: "asc" },
          select: { type: true, url: true, mimeType: true },
        },
        manuscriptOcr: { select: { ocrStatus: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-bg pt-16 md:pt-20">
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
        <SavedClient likedPosts={likedPosts} savedPosts={savedPosts} />
      </div>
    </div>
  );
}
