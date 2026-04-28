"use client";

import { useMemo, useState } from "react";
import TabBar from "@/components/profile/TabBar";
import PostGrid from "@/components/profile/PostGrid";

type SavedPost = {
  id: string;
  title: string;
  isPublic: boolean;
  media: { type: string; url: string; mimeType: string | null }[];
  _count: { likes: number; comments: number };
  manuscriptOcr?: { ocrStatus: string } | null;
};

type SavedClientProps = {
  likedPosts: SavedPost[];
  savedPosts: SavedPost[];
};

export default function SavedClient({ likedPosts, savedPosts }: SavedClientProps) {
  const [collectionTab, setCollectionTab] = useState("saved");
  const [mediaTab, setMediaTab] = useState("all");

  const collectionTabs = useMemo(
    () => [
      { id: "saved", label: `Saved (${savedPosts.length})` },
      { id: "liked", label: `Liked (${likedPosts.length})` },
    ],
    [likedPosts.length, savedPosts.length]
  );

  const mediaTabs = useMemo(
    () => [
      { id: "all", label: "All" },
      { id: "images", label: "Images" },
      { id: "video", label: "Video" },
      { id: "audio", label: "Audio" },
    ],
    []
  );

  const activeCollection = collectionTab === "liked" ? likedPosts : savedPosts;

  const filteredPosts = useMemo(() => {
    switch (mediaTab) {
      case "images":
        return activeCollection.filter((post) =>
          post.media.some((media) => media.type === "IMAGE")
        );
      case "video":
        return activeCollection.filter((post) =>
          post.media.some((media) => media.type === "VIDEO")
        );
      case "audio":
        return activeCollection.filter((post) =>
          post.media.some((media) => media.type === "AUDIO")
        );
      default:
        return activeCollection;
    }
  }, [activeCollection, mediaTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-text-primary">Saved</h1>
        <p className="mt-1 text-sm text-text-muted">
          Browse your bookmarked and liked posts.
        </p>
      </div>

      <TabBar tabs={collectionTabs} activeTab={collectionTab} onTabChange={setCollectionTab} />

      <TabBar tabs={mediaTabs} activeTab={mediaTab} onTabChange={setMediaTab} />

      <PostGrid posts={filteredPosts} />
    </div>
  );
}
