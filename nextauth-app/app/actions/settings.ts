"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdateProfileSettingsSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must be at most 24 characters")
    .regex(/^[a-z0-9_]+$/, "Use only lowercase letters, numbers, and underscore"),
  isPrivate: z.boolean(),
});

export async function updateProfileSettings(input: {
  username: string;
  isPrivate: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = UpdateProfileSettingsSchema.parse({
    username: input.username.trim().toLowerCase(),
    isPrivate: input.isPrivate,
  });

  const existing = await prisma.user.findFirst({
    where: {
      username: validated.username,
      NOT: { id: session.user.id },
    },
    select: { id: true },
  });
  if (existing) {
    throw new Error("Username is already taken");
  }

  const previous = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      username: validated.username,
      isPrivate: validated.isPrivate,
    },
    select: {
      id: true,
      username: true,
      isPrivate: true,
    },
  });

  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);
  if (previous?.username) {
    revalidatePath(`/profile/${previous.username}`);
  }
  revalidatePath(`/profile/${user.username}`);

  return {
    success: true,
    username: user.username ?? user.id,
    isPrivate: user.isPrivate,
  };
}
