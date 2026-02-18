"use client";

import Avatar from "@/components/ui/Avatar";
import FollowButton from "@/components/feed/FollowButton";
import Modal from "@/components/ui/Modal";
import Link from "next/link";

type FollowUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  isFollowing: boolean;
};

type FollowListProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  users: FollowUser[];
  currentUserId?: string;
};

export default function FollowList({ open, onOpenChange, title, users, currentUserId }: FollowListProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <div className="max-h-[400px] space-y-1 overflow-y-auto">
        {users.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">No users yet</p>
        )}
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-bg">
            <Link
              href={`/profile/${user.username || user.id}`}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3"
            >
              <Avatar src={user.image} name={user.name} size="md" />
              <div>
                <p className="text-sm font-medium text-text-primary">{user.name || "Unnamed"}</p>
                {user.username && (
                  <p className="text-xs text-text-muted">@{user.username}</p>
                )}
              </div>
            </Link>
            {currentUserId && currentUserId !== user.id && (
              <FollowButton
                targetUserId={user.id}
                initialFollowing={user.isFollowing}
                compact
              />
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
