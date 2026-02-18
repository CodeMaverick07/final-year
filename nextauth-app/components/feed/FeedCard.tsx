"use client";

import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import MediaCarousel from "@/components/feed/MediaCarousel";
import LikeButton from "@/components/feed/LikeButton";
import BookmarkButton from "@/components/feed/BookmarkButton";
import FollowButton from "@/components/feed/FollowButton";
import CommentInput from "@/components/feed/CommentInput";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

type FeedCardProps = {
  post: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    createdAt: Date;
    authorId: string;
    authorName: string | null;
    authorImage: string | null;
    authorUsername: string | null;
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
    isBookmarked: boolean;
    isFollowing: boolean;
    media: {
      id: string;
      type: string;
      url: string;
      mimeType: string | null;
      width: number | null;
      height: number | null;
      duration: number | null;
      order: number;
    }[];
    tags: string[];
    recentComments: {
      id: string;
      body: string;
      userName: string | null;
      userImage: string | null;
    }[];
    ocrStatus?: string | null;
  };
  currentUser?: { id: string; name?: string | null; image?: string | null };
  animationDelay?: number;
};

export default function FeedCard({ post, currentUser, animationDelay = 0 }: FeedCardProps) {
  const [comments, setComments] = useState(post.recentComments);
  const [commentCount, setCommentCount] = useState(post.commentCount);

  return (
    <article
      className="feed-card border-b border-border pb-6"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Author Row */}
      <div className="flex items-center justify-between px-1 pb-3">
        <Link href={`/profile/${post.authorUsername || post.authorId}`} className="flex items-center gap-3">
          <Avatar src={post.authorImage} name={post.authorName} size="md" />
          <div>
            <p className="text-sm font-medium text-text-primary">{post.authorName || "Anonymous"}</p>
            {post.authorUsername && (
              <p className="text-xs text-text-muted">@{post.authorUsername}</p>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
          {currentUser && currentUser.id !== post.authorId && (
            <FollowButton
              targetUserId={post.authorId}
              initialFollowing={post.isFollowing}
              compact
            />
          )}
        </div>
      </div>

      {/* Media Carousel */}
      {post.media.length > 0 && (
        <div className="mb-3">
          <MediaCarousel media={post.media} />
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-4">
          <LikeButton postId={post.id} initialLiked={post.isLiked} initialCount={post.likeCount} />
          <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 text-text-muted transition-colors hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm font-medium">{commentCount}</span>
          </Link>
        </div>
        <BookmarkButton postId={post.id} initialBookmarked={post.isBookmarked} />
      </div>

      {/* Title & Description */}
      <div className="px-1 pb-2">
        <Link href={`/post/${post.id}`}>
          <h3 className="font-heading text-lg font-semibold text-text-primary hover:text-accent transition-colors">
            {post.title}
          </h3>
        </Link>
        {post.subtitle && (
          <p className="text-sm text-text-muted mt-0.5">{post.subtitle}</p>
        )}
        {post.description && (
          <p className="mt-1 text-sm text-text-muted line-clamp-2">{post.description}</p>
        )}
      </div>

      {/* Tags */}
      {(post.tags.length > 0 || post.ocrStatus === "DONE") && (
        <div className="flex flex-wrap gap-1.5 px-1 pb-3">
          {post.ocrStatus === "DONE" && (
            <span className="ocr-badge" title="OCR text available">📜</span>
          )}
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Recent Comments */}
      {comments.length > 0 && (
        <div className="space-y-1.5 px-1 pb-3">
          {comments.map((c) => (
            <p key={c.id} className="text-sm">
              <span className="font-medium text-text-primary">{c.userName || "User"}</span>{" "}
              <span className="text-text-muted">{c.body}</span>
            </p>
          ))}
          {commentCount > 2 && (
            <Link href={`/post/${post.id}`} className="text-xs text-text-muted hover:text-accent transition-colors">
              View all {commentCount} comments
            </Link>
          )}
        </div>
      )}

      {/* Inline Comment */}
      {currentUser && (
        <div className="px-1">
          <CommentInput
            postId={post.id}
            userImage={currentUser.image}
            userName={currentUser.name}
            onCommentAdded={(c) => {
              setComments((prev) => [c, ...prev].slice(0, 2));
              setCommentCount((prev) => prev + 1);
            }}
          />
        </div>
      )}
    </article>
  );
}
