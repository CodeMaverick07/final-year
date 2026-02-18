import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Post and media records are already created in initiateUpload
  // This endpoint is called after all S3 PUTs complete
  // Could be used to flip a "processing" flag if needed
  return NextResponse.json({ success: true });
}
