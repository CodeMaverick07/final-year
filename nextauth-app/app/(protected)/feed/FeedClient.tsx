"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import FeedCard from "@/components/feed/FeedCard";
import FollowButton from "@/components/feed/FollowButton";
import Avatar from "@/components/ui/Avatar";
import { fetchFeed } from "@/app/actions/feed";
import type { FeedPost, SearchUser } from "@/lib/feed";

type FeedClientProps = {
  initialPosts: FeedPost[];
  currentUser: { id: string; name?: string | null; image?: string | null };
};

export default function FeedClient({ initialPosts, currentUser }: FeedClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState<string | null>(String(initialPosts.length));
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [searchPosts, setSearchPosts] = useState<FeedPost[]>([]);
  const loaderRef = useRef<HTMLDivElement>(null);
  const isSearchMode = query.trim().length > 0;

  // Sync with server-side revalidation
  useEffect(() => {
    setPosts(initialPosts);
    setCursor(String(initialPosts.length));
  }, [initialPosts]);

  const loadMore = useCallback(async () => {
    if (loading || !cursor || isSearchMode) return;
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
  }, [cursor, loading, isSearchMode]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchUsers([]);
      setSearchPosts([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { users: SearchUser[]; posts: FeedPost[] };
        if (cancelled) return;
        setSearchUsers(data.users || []);
        setSearchPosts(data.posts || []);
      } catch {
        if (!cancelled) {
          setSearchUsers([]);
          setSearchPosts([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

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

  if (!isSearchMode && posts.length === 0) {
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
      <div className="rounded-lg border border-border bg-bg-surface px-3 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts or users..."
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      </div>

      {isSearchMode ? (
        <div className="space-y-6">
          {searching && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
          )}

          {!searching && (
            <>
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Users
                </h2>
                {searchUsers.length === 0 ? (
                  <p className="text-sm text-text-muted">No users found.</p>
                ) : (
                  <div className="space-y-2">
                    {searchUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-bg-surface p-3"
                      >
                        <Link
                          href={`/profile/${user.username || user.id}`}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <Avatar src={user.image} name={user.name} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {user.name || "Unnamed"}
                            </p>
                            <p className="truncate text-xs text-text-muted">
                              @{user.username || user.id}
                              {user.isPrivate ? " · Private" : ""}
                            </p>
                          </div>
                        </Link>
                        <FollowButton
                          targetUserId={user.id}
                          initialFollowing={user.isFollowing}
                          compact
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Posts
                </h2>
                {searchPosts.length === 0 ? (
                  <p className="text-sm text-text-muted">No posts found.</p>
                ) : (
                  searchPosts.map((post, i) => (
                    <FeedCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      animationDelay={i * 40}
                    />
                  ))
                )}
              </section>
            </>
          )}
        </div>
      ) : (
        <>
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
              <p className="py-4 text-center text-xs text-text-muted">
                You&apos;ve reached the end
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
