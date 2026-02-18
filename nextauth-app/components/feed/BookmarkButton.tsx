"use client";

import { useOptimistic, useTransition } from "react";
import { toggleBookmark } from "@/app/actions/social";

type BookmarkButtonProps = {
  postId: string;
  initialBookmarked: boolean;
};

export default function BookmarkButton({ postId, initialBookmarked }: BookmarkButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(
    { bookmarked: initialBookmarked },
    (state, action: "bookmark" | "unbookmark") => ({
      bookmarked: action === "bookmark",
    })
  );

  function handleBookmark() {
    const action = optimistic.bookmarked ? "unbookmark" : "bookmark";
    startTransition(async () => {
      addOptimistic(action);
      await toggleBookmark(postId);
    });
  }

  return (
    <button
      onClick={handleBookmark}
      disabled={isPending}
      className="transition-colors"
      aria-label={optimistic.bookmarked ? "Remove bookmark" : "Bookmark"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={optimistic.bookmarked ? "#C9A96E" : "none"}
        stroke={optimistic.bookmarked ? "#C9A96E" : "#7A7570"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-colors ${!optimistic.bookmarked ? "hover:stroke-accent" : ""}`}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
