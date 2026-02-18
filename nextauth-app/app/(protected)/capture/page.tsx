import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CaptureClient } from "./CaptureClient";

export default async function CapturePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <CaptureClient userId={session.user.id!} />;
}
