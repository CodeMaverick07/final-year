import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      isPrivate: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-bg pt-16 md:pt-20">
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-8">
        <SettingsClient
          initial={{
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username ?? "",
            isPrivate: user.isPrivate,
          }}
        />
      </div>
    </div>
  );
}
