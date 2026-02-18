"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ── Like ─────────────────────────────────────────────────────────────────────
export async function toggleLike(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: session.user.id, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath(`/post/${postId}`);
    return { liked: false };
  }

  await prisma.like.create({ data: { userId: session.user.id, postId } });
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath(`/post/${postId}`);
  return { liked: true };
}

// ── Comment ───────────────────────────────────────────────────────────────────
export async function addComment(postId: string, body: string, parentId?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!body.trim()) throw new Error("Comment body is required");

  const comment = await prisma.comment.create({
    data: { body: body.trim(), postId, userId: session.user.id, parentId },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath(`/post/${postId}`);
  return comment;
}

// ── Bookmark ──────────────────────────────────────────────────────────────────
export async function toggleBookmark(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.bookmark.findUnique({
    where: { userId_postId: { userId: session.user.id, postId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath(`/post/${postId}`);
    return { bookmarked: false };
  }

  await prisma.bookmark.create({ data: { userId: session.user.id, postId } });
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath(`/post/${postId}`);
  return { bookmarked: true };
}

// ── Follow ────────────────────────────────────────────────────────────────────
export async function toggleFollow(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.id === targetUserId) throw new Error("Cannot follow yourself");

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: targetUserId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath(`/profile/${targetUserId}`);
    return { following: false };
  }

  await prisma.follow.create({
    data: { followerId: session.user.id, followingId: targetUserId },
  });
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath(`/profile/${targetUserId}`);
  return { following: true };
}
