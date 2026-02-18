"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteS3Object } from "@/lib/s3";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  caption: z.string().max(5000).optional().nullable(),
  isPublic: z.boolean(),
  tags: z.array(z.string().min(1).max(50)).max(10),
});

type UpdatePostInput = z.infer<typeof UpdatePostSchema>;

function normalizeTags(tags: string[]) {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }

  return unique.slice(0, 10);
}

function revalidatePostPaths(postId: string, username?: string | null) {
  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath("/saved");
  revalidatePath(`/post/${postId}`);
  if (username) {
    revalidatePath(`/profile/${username}`);
  }
}

export async function updatePostDetails(postId: string, input: UpdatePostInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      author: { select: { username: true } },
    },
  });

  if (!existing) {
    throw new Error("Post not found");
  }
  if (existing.authorId !== session.user.id) {
    throw new Error("Only the author can edit this post");
  }

  const validated = UpdatePostSchema.parse(input);
  const tags = normalizeTags(validated.tags);
  const tagIds = await Promise.all(
    tags.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
        select: { id: true },
      })
    )
  );

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      title: validated.title.trim(),
      subtitle: validated.subtitle?.trim() || null,
      description: validated.caption?.trim() || null,
      isPublic: validated.isPublic,
      tags: {
        deleteMany: {},
        create: tagIds.map((tag) => ({ tagId: tag.id })),
      },
    },
    select: {
      title: true,
      subtitle: true,
      description: true,
      isPublic: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  revalidatePostPaths(postId, existing.author.username);

  return {
    success: true,
    post: {
      title: updated.title,
      subtitle: updated.subtitle,
      caption: updated.description,
      isPublic: updated.isPublic,
      tags: updated.tags.map((t) => t.tag.name),
    },
  };
}

export async function deletePost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      author: { select: { username: true } },
      media: { select: { s3Key: true } },
    },
  });

  if (!existing) {
    throw new Error("Post not found");
  }
  if (existing.authorId !== session.user.id) {
    throw new Error("Only the author can delete this post");
  }

  await prisma.$transaction(async (tx) => {
    await tx.processingJob.deleteMany({ where: { postId } });
    await tx.post.delete({ where: { id: postId } });
  });

  const deletionResults = await Promise.allSettled(
    existing.media.map((media) => deleteS3Object(media.s3Key))
  );
  deletionResults.forEach((result, idx) => {
    if (result.status === "rejected") {
      console.error("[deletePost] failed to delete S3 object", {
        postId,
        s3Key: existing.media[idx]?.s3Key,
        error: result.reason,
      });
    }
  });

  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath("/saved");
  if (existing.author.username) {
    revalidatePath(`/profile/${existing.author.username}`);
  }

  return { success: true };
}
