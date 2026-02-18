"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import MediaCarousel from "@/components/feed/MediaCarousel";
import LikeButton from "@/components/feed/LikeButton";
import BookmarkButton from "@/components/feed/BookmarkButton";
import FollowButton from "@/components/feed/FollowButton";
import CommentInput from "@/components/feed/CommentInput";
import { PostOwnerActions } from "@/components/post/PostOwnerActions";
import { formatDistanceToNow } from "date-fns";

type Comment = {
  id: string;
  body: string;
  createdAt: Date;
  user: { id: string; name: string | null; image: string | null };
  replies: {
    id: string;
    body: string;
    createdAt: Date;
    user: { id: string; name: string | null; image: string | null };
  }[];
};

type PostDetailClientProps = {
  post: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    isPublic: boolean;
    createdAt: Date;
    author: { id: string; name: string | null; username: string | null; image: string | null };
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
    comments: Comment[];
    _count: { likes: number; comments: number };
  };
  isLiked: boolean;
  isBookmarked: boolean;
  isFollowing: boolean;
  currentUser: { id: string; name?: string | null; image?: string | null };
};

export default function PostDetailClient({
  post,
  isLiked,
  isBookmarked,
  isFollowing,
  currentUser,
}: PostDetailClientProps) {
  const [comments, setComments] = useState(post.comments);
  const [details, setDetails] = useState({
    title: post.title,
    subtitle: post.subtitle,
    caption: post.description,
    isPublic: post.isPublic,
    tags: post.tags,
  });

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to feed
      </Link>

      {/* Author */}
      <div className="flex items-center justify-between">
        <Link href={`/profile/${post.author.username || post.author.id}`} className="flex items-center gap-3">
          <Avatar src={post.author.image} name={post.author.name} size="lg" />
          <div>
            <p className="font-medium text-text-primary">{post.author.name || "Anonymous"}</p>
            {post.author.username && (
              <p className="text-sm text-text-muted">@{post.author.username}</p>
            )}
          </div>
        </Link>
        {currentUser.id !== post.author.id ? (
          <FollowButton targetUserId={post.author.id} initialFollowing={isFollowing} />
        ) : (
          <PostOwnerActions
            postId={post.id}
            initial={details}
            onUpdated={(next) => setDetails(next)}
          />
        )}
      </div>

      {/* Media */}
      {post.media.length > 0 && <MediaCarousel media={post.media} />}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LikeButton postId={post.id} initialLiked={isLiked} initialCount={post._count.likes} />
          <span className="flex items-center gap-1.5 text-text-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm font-medium">{post._count.comments}</span>
          </span>
        </div>
        <BookmarkButton postId={post.id} initialBookmarked={isBookmarked} />
      </div>

      {/* Title & Description */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">{details.title}</h1>
        {details.subtitle && (
          <p className="mt-1 text-base text-text-muted">{details.subtitle}</p>
        )}
        {details.caption && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-primary/80">
            {details.caption}
          </p>
        )}
        <p className="mt-2 text-xs text-text-muted">
          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          {!details.isPublic && " · Private"}
        </p>
      </div>

      {/* Tags */}
      {details.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {details.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Comments */}
      <div className="border-t border-border pt-6">
        <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
          Comments ({post._count.comments})
        </h2>

        {/* Add Comment */}
        <div className="mb-6">
          <CommentInput
            postId={post.id}
            userImage={currentUser.image}
            userName={currentUser.name}
            onCommentAdded={(c) => {
              setComments((prev) => [
                ...prev,
                {
                  id: c.id,
                  body: c.body,
                  createdAt: new Date(),
                  user: {
                    id: currentUser.id,
                    name: c.userName,
                    image: c.userImage,
                  },
                  replies: [],
                },
              ]);
            }}
          />
        </div>

        {/* Comment List */}
        <div className="space-y-4">
          {comments.length === 0 && (
            <p className="text-center text-sm text-text-muted">No comments yet. Be the first!</p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <div className="flex gap-3">
                <Avatar src={comment.user.image} name={comment.user.name} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {comment.user.name || "User"}
                    </span>
                    <span className="text-xs text-text-muted">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-text-primary/80">{comment.body}</p>
                </div>
              </div>

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-10 space-y-3 border-l border-border pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <Avatar src={reply.user.image} name={reply.user.name} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">
                            {reply.user.name || "User"}
                          </span>
                          <span className="text-xs text-text-muted">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-text-primary/80">{reply.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
