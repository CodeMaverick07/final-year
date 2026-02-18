import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getRecommendedFeed } from "@/lib/feed";
import FeedClient from "./FeedClient";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const initialPosts = await getRecommendedFeed(session.user.id);

  return (
    <div className="min-h-screen bg-bg pt-16 md:pt-20">
      <div className="mx-auto max-w-xl px-4 py-6 md:py-8">
        <h1 className="mb-8 text-center font-heading text-3xl font-bold text-text-primary">
          Discover
        </h1>
        <FeedClient
          initialPosts={initialPosts}
          currentUser={{
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
          }}
        />
      </div>
    </div>
  );
}
