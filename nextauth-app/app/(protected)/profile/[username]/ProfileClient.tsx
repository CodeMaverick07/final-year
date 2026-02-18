"use client";

import { useState, useMemo } from "react";
import ProfileHeader from "@/components/profile/ProfileHeader";
import PostGrid from "@/components/profile/PostGrid";
import TabBar from "@/components/profile/TabBar";
import FollowList from "@/components/profile/FollowList";

type Post = {
  id: string;
  title: string;
  isPublic: boolean;
  media: { type: string; url: string }[];
  _count: { likes: number; comments: number };
};

type FollowUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  isFollowing: boolean;
};

type ProfileClientProps = {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    bio: string | null;
    _count: { posts: number; followers: number; following: number };
  };
  isOwnProfile: boolean;
  isFollowing: boolean;
  posts: Post[];
  followers: FollowUser[];
  following: FollowUser[];
  currentUserId: string;
};

export default function ProfileClient({
  user,
  isOwnProfile,
  isFollowing,
  posts,
  followers,
  following,
  currentUserId,
}: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const tabs = useMemo(() => {
    const base = [
      { id: "all", label: "All" },
      { id: "images", label: "Images" },
      { id: "audio", label: "Audio" },
      { id: "video", label: "Video" },
      { id: "public", label: "Public" },
    ];
    if (isOwnProfile) {
      base.push({ id: "private", label: "Private" });
    }
    return base;
  }, [isOwnProfile]);

  const filteredPosts = useMemo(() => {
    switch (activeTab) {
      case "images":
        return posts.filter((p) => p.media.some((m) => m.type === "IMAGE"));
      case "audio":
        return posts.filter((p) => p.media.some((m) => m.type === "AUDIO"));
      case "video":
        return posts.filter((p) => p.media.some((m) => m.type === "VIDEO"));
      case "public":
        return posts.filter((p) => p.isPublic);
      case "private":
        return posts.filter((p) => !p.isPublic);
      default:
        return posts;
    }
  }, [posts, activeTab]);

  return (
    <>
      {/* Make follower/following counts clickable */}
      <div onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-followers]')) setShowFollowers(true);
        if (target.closest('[data-following]')) setShowFollowing(true);
      }}>
        <ProfileHeader user={user} isOwnProfile={isOwnProfile} isFollowing={isFollowing} />
      </div>

      <div className="mt-6">
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="mt-6">
        <PostGrid posts={filteredPosts} />
      </div>

      <FollowList
        open={showFollowers}
        onOpenChange={setShowFollowers}
        title="Followers"
        users={followers}
        currentUserId={currentUserId}
      />

      <FollowList
        open={showFollowing}
        onOpenChange={setShowFollowing}
        title="Following"
        users={following}
        currentUserId={currentUserId}
      />
    </>
  );
}
