"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFollow } from "@/app/actions/social";

type FollowButtonProps = {
  targetUserId: string;
  initialFollowing: boolean;
  compact?: boolean;
};

export default function FollowButton({ targetUserId, initialFollowing, compact = false }: FollowButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(
    { following: initialFollowing },
    (state, action: "follow" | "unfollow") => ({
      following: action === "follow",
    })
  );

  function handleFollow() {
    const action = optimistic.following ? "unfollow" : "follow";
    addOptimistic(action);
    startTransition(async () => {
      await toggleFollow(targetUserId);
    });
  }

  if (compact) {
    return (
      <button
        onClick={handleFollow}
        disabled={isPending}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
          optimistic.following
            ? "border border-border text-text-muted hover:border-like-red hover:text-like-red"
            : "bg-accent text-bg hover:bg-accent/90"
        }`}
      >
        {optimistic.following ? "Following" : "Follow"}
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isPending}
      className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
        optimistic.following
          ? "border border-border text-text-muted hover:border-like-red hover:text-like-red"
          : "bg-accent text-bg hover:bg-accent/90"
      }`}
    >
      {optimistic.following ? "Following" : "Follow"}
    </button>
  );
}
