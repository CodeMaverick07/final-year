import Link from "next/link";

type PostGridItem = {
  id: string;
  title: string;
  isPublic: boolean;
  media: { type: string; url: string; mimeType: string | null }[];
  _count: { likes: number; comments: number };
  manuscriptOcr?: { ocrStatus: string } | null;
};

type PostGridProps = {
  posts: PostGridItem[];
};

export default function PostGrid({ posts }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7A7570" strokeWidth="1.5" className="mb-3">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="text-sm text-text-muted">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {posts.map((post) => {
        const firstMedia = post.media[0];
        return (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-bg-surface"
          >
            {/* Thumbnail */}
            {firstMedia?.type === "IMAGE" && firstMedia.mimeType !== "application/pdf" ? (
              <img
                src={firstMedia.url}
                alt={post.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : firstMedia?.type === "VIDEO" ? (
              <div className="flex h-full w-full items-center justify-center bg-bg-surface">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            ) : firstMedia?.type === "AUDIO" ? (
              <div className="flex h-full w-full items-center justify-center bg-bg-surface">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-bg-surface text-text-muted">
                <span className="text-xs">No media</span>
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
              <div className="w-full p-3">
                <p className="truncate text-sm font-medium text-white">{post.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-white/70">
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {post._count.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {post._count.comments}
                  </span>
                </div>
              </div>
            </div>

            {/* Private Lock */}
            {!post.isPublic && (
              <div className="absolute right-2 top-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            )}

            {/* OCR Badge */}
            {post.manuscriptOcr?.ocrStatus === "DONE" && (
              <div className="absolute left-2 top-2">
                <span className="ocr-badge" title="OCR text available">📜</span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
