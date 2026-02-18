import { prisma } from "@/lib/prisma";

export type FeedPost = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  isPublic: boolean;
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

export async function getRecommendedFeed(
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<FeedPost[]> {
  // Use a scored query approach
  // Prisma doesn't support CTEs directly, so we use a simpler ranked approach
  
  const offset = cursor ? parseInt(cursor) : 0;

  // Get the user's following list, liked post tags
  const [followingIds, likedTagIds] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }).then(f => f.map(x => x.followingId)),
    prisma.like.findMany({
      where: { userId },
      select: { post: { select: { tags: { select: { tag: { select: { id: true } } } } } } },
    }).then(likes => {
      const ids = new Set<string>();
      likes.forEach(l => l.post.tags.forEach(t => ids.add(t.tag.id)));
      return Array.from(ids);
    }),
  ]);

  // Fetch candidate posts
  const posts = await prisma.post.findMany({
    where: {
      AND: [
        { authorId: { not: userId } }, // exclude own posts
        { isPublic: true },
      ],
    },
    include: {
      author: { select: { id: true, name: true, image: true, username: true } },
      media: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
      likes: { where: { userId }, select: { id: true } },
      bookmarks: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        take: 2,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, image: true } } },
      },
      manuscriptOcr: { select: { ocrStatus: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 3, // fetch more to score and re-rank
    skip: offset,
  });

  // Score and rank
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const scored = posts.map(post => {
    let score = 0;

    // +10 if from followed user
    if (followingIds.includes(post.authorId)) score += 10;

    // +3 if tags overlap with user's liked tags
    const postTagIds = post.tags.map(t => t.tag.id);
    if (postTagIds.some(id => likedTagIds.includes(id))) score += 3;

    // +2 if recent (within 7 days)
    if (post.createdAt >= sevenDaysAgo) score += 2;

    // +1 if popular
    if (post._count.likes > 10) score += 1;

    // -100 if already liked
    if (post.likes.length > 0) score -= 100;

    return { post, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.post.createdAt.getTime() - a.post.createdAt.getTime();
  });

  const isFollowingSet = new Set(followingIds);

  return scored.slice(0, limit).map(({ post }) => ({
    id: post.id,
    title: post.title,
    subtitle: post.subtitle,
    description: post.description,
    isPublic: post.isPublic,
    createdAt: post.createdAt,
    authorId: post.author.id,
    authorName: post.author.name,
    authorImage: post.author.image,
    authorUsername: post.author.username,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    isLiked: post.likes.length > 0,
    isBookmarked: post.bookmarks.length > 0,
    isFollowing: isFollowingSet.has(post.author.id),
    media: post.media.map(m => ({
      id: m.id,
      type: m.type,
      url: m.url,
      mimeType: m.mimeType,
      width: m.width,
      height: m.height,
      duration: m.duration,
      order: m.order,
    })),
    tags: post.tags.map(t => t.tag.name),
    recentComments: post.comments.map(c => ({
      id: c.id,
      body: c.body,
      userName: c.user.name,
      userImage: c.user.image,
    })),
    ocrStatus: post.manuscriptOcr?.ocrStatus ?? null,
  }));
}
