import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RecordClient } from "./RecordClient";

export default async function RecordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <RecordClient userId={session.user.id!} />;
}
