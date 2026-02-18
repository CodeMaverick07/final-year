import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import ProfileClient from "./ProfileClient";

type Props = {
  params: { username: string };
};

export default async function UserProfilePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { username } = params;

  // Try to find user by username first, then by id
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { id: username }],
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      _count: {
        select: {
          posts: true,
          followers: true,
          following: true,
        },
      },
    },
  });

  if (!user) notFound();

  const isOwnProfile = session.user.id === user.id;

  // Check if current user follows this user
  const isFollowing = !isOwnProfile
    ? !!(await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: user.id,
          },
        },
      }))
    : false;

  // Fetch all posts for the user
  const posts = await prisma.post.findMany({
    where: {
      authorId: user.id,
      ...(isOwnProfile ? {} : { isPublic: true }),
    },
    include: {
      media: { orderBy: { order: "asc" }, take: 1, select: { type: true, url: true } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch followers and following for the modal
  const [followers, following] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: user.id },
      include: {
        follower: { select: { id: true, name: true, username: true, image: true } },
      },
    }),
    prisma.follow.findMany({
      where: { followerId: user.id },
      include: {
        following: { select: { id: true, name: true, username: true, image: true } },
      },
    }),
  ]);

  // Check which of these users the current user follows
  const currentUserFollowingIds = new Set(
    (
      await prisma.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true },
      })
    ).map((f) => f.followingId)
  );

  const followerList = followers.map((f) => ({
    ...f.follower,
    isFollowing: currentUserFollowingIds.has(f.follower.id),
  }));

  const followingList = following.map((f) => ({
    ...f.following,
    isFollowing: currentUserFollowingIds.has(f.following.id),
  }));

  return (
    <div className="min-h-screen bg-bg pt-20">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ProfileClient
          user={user}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          posts={posts}
          followers={followerList}
          following={followingList}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
