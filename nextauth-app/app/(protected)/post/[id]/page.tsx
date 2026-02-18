import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PostDetailClient from "./PostDetailClient";
import { OcrStatusBanner } from "@/components/post/OcrStatusBanner";
import { ManuscriptText } from "@/components/post/ManuscriptText";
import { TranslationPanel } from "@/components/post/TranslationPanel";

type Props = {
  params: { id: string };
};

export default async function PostDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, isPrivate: true },
      },
      media: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
          replies: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        where: { parentId: null }, // top-level only
      },
      _count: { select: { likes: true, comments: true } },
      manuscriptOcr: true,
    },
  });

  if (!post) notFound();

  const [isLiked, isBookmarked, isFollowing] = await Promise.all([
    prisma.like.findUnique({
      where: { userId_postId: { userId: session.user.id, postId: id } },
    }).then(Boolean),
    prisma.bookmark.findUnique({
      where: { userId_postId: { userId: session.user.id, postId: id } },
    }).then(Boolean),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: post.authorId,
        },
      },
    }).then(Boolean),
  ]);

  const isOwnPost = post.authorId === session.user.id;
  if (!isOwnPost) {
    if (!post.isPublic) notFound();
    if (post.author.isPrivate && !isFollowing) notFound();
  }

  const ocr = post.manuscriptOcr;

  return (
    <div className="min-h-screen bg-bg pt-16 md:pt-20">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <PostDetailClient
          post={{
            ...post,
            tags: post.tags.map((t) => t.tag.name),
          }}
          isLiked={isLiked}
          isBookmarked={isBookmarked}
          isFollowing={isFollowing}
          currentUser={{
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
          }}
        />

        {/* ── Manuscript OCR Section ─────────────────────────────── */}
        {ocr && (
          <div className="mt-8 space-y-6">
            {/* Status Banner (shows while processing) */}
            {ocr.ocrStatus !== "DONE" && (
              <OcrStatusBanner
                postId={post.id}
                initialStatus={ocr.ocrStatus}
              />
            )}

            {/* Manuscript Text (raw + reconstructed tabs) */}
            {ocr.ocrStatus === "DONE" && (
              <>
                <ManuscriptText
                  rawOcrText={ocr.rawOcrText}
                  reconstructedText={ocr.reconstructedText}
                />

                {/* Translation Panel */}
                <TranslationPanel
                  postId={post.id}
                  initialStatus={ocr.translationStatus}
                  initialHindi={ocr.translationHindi}
                  initialEnglish={ocr.translationEnglish}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
