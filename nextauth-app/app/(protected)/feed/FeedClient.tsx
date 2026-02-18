"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import FeedCard from "@/components/feed/FeedCard";
import { fetchFeed } from "@/app/actions/feed";
import type { FeedPost } from "@/lib/feed";

type FeedClientProps = {
  initialPosts: FeedPost[];
  currentUser: { id: string; name?: string | null; image?: string | null };
};

export default function FeedClient({ initialPosts, currentUser }: FeedClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState<string | null>(String(initialPosts.length));
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Sync with server-side revalidation
  useEffect(() => {
    setPosts(initialPosts);
    setCursor(String(initialPosts.length));
  }, [initialPosts]);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const result = await fetchFeed(cursor);
      setPosts((prev) => [...prev, ...result.posts]);
      setCursor(result.nextCursor);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (posts.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7A7570" strokeWidth="1" className="mb-4">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <p className="font-heading text-lg text-text-primary">Your feed is empty</p>
        <p className="mt-1 text-sm text-text-muted">
          Follow others or upload manuscripts to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post, i) => (
        <FeedCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          animationDelay={i < initialPosts.length ? i * 80 : 0}
        />
      ))}

      {/* Infinite scroll trigger */}
      <div ref={loaderRef} className="h-10">
        {loading && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}
        {!cursor && posts.length > 0 && (
          <p className="py-4 text-center text-xs text-text-muted">You&apos;ve reached the end</p>
        )}
      </div>
    </div>
  );
}
