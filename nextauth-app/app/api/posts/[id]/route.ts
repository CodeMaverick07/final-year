import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, isPrivate: true },
      },
      media: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isOwnPost = post.authorId === session.user.id;
  if (!isOwnPost) {
    if (!post.isPublic) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.author.isPrivate) {
      const followsAuthor = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: post.authorId,
          },
        },
        select: { id: true },
      });
      if (!followsAuthor) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
    }
  }

  return NextResponse.json(post);
}
