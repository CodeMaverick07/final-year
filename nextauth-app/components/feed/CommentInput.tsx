"use client";

import { useState, useTransition } from "react";
import { addComment } from "@/app/actions/social";
import Avatar from "@/components/ui/Avatar";

type CommentInputProps = {
  postId: string;
  userImage?: string | null;
  userName?: string | null;
  onCommentAdded?: (comment: { id: string; body: string; userName: string | null; userImage: string | null }) => void;
};

export default function CommentInput({ postId, userImage, userName, onCommentAdded }: CommentInputProps) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    const text = body.trim();
    setBody("");

    startTransition(async () => {
      const comment = await addComment(postId, text);
      onCommentAdded?.({
        id: comment.id,
        body: comment.body,
        userName: comment.user.name,
        userImage: comment.user.image,
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <Avatar src={userImage} name={userName} size="sm" />
      <div className="relative flex-1">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          disabled={isPending}
          className="h-9 w-full rounded-full border border-border bg-bg px-4 pr-16 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!body.trim() || isPending}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-bg transition-opacity disabled:opacity-30"
        >
          Post
        </button>
      </div>
    </form>
  );
}
