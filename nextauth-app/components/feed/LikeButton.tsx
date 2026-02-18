"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/app/actions/social";

type LikeButtonProps = {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
};

export default function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(
    { count: initialCount, liked: initialLiked },
    (state, action: "like" | "unlike") => ({
      count: action === "like" ? state.count + 1 : state.count - 1,
      liked: action === "like",
    })
  );

  function handleLike() {
    const action = optimistic.liked ? "unlike" : "like";
    addOptimistic(action);
    startTransition(async () => {
      await toggleLike(postId);
    });
  }

  return (
    <button
      onClick={handleLike}
      disabled={isPending}
      className="group flex items-center gap-1.5 transition-colors"
      aria-label={optimistic.liked ? "Unlike" : "Like"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={optimistic.liked ? "#D4574A" : "none"}
        stroke={optimistic.liked ? "#D4574A" : "#7A7570"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-all ${optimistic.liked ? "like-pulse" : "group-hover:stroke-like-red"}`}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className={`text-sm font-medium ${optimistic.liked ? "text-like-red" : "text-text-muted"}`}>
        {optimistic.count}
      </span>
    </button>
  );
}
