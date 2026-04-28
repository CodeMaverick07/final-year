import Avatar from "@/components/ui/Avatar";
import FollowButton from "@/components/feed/FollowButton";

type ProfileHeaderProps = {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    bio: string | null;
    isPrivate: boolean;
    _count: {
      posts: number;
      followers: number;
      following: number;
    };
  };
  isOwnProfile: boolean;
  isFollowing: boolean;
  canViewConnections: boolean;
};

export default function ProfileHeader({
  user,
  isOwnProfile,
  isFollowing,
  canViewConnections,
}: ProfileHeaderProps) {
  return (
    <div className="border-b border-border pb-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <Avatar src={user.image} name={user.name} size="xl" />

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              {user.name || "Unnamed"}
            </h1>
            {!isOwnProfile && (
              <FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
            )}
          </div>

          {user.username && (
            <p className="mt-0.5 text-sm text-text-muted">@{user.username}</p>
          )}
          {user.isPrivate && (
            <p className="mt-1 text-xs text-text-muted">Private account</p>
          )}

          {user.bio && (
            <p className="mt-2 max-w-lg text-sm text-text-primary/80">{user.bio}</p>
          )}

          {/* Stats */}
          <div className="mt-4 flex items-center justify-center gap-6 sm:justify-start">
            <div className="text-center">
              <p className="font-heading text-lg font-bold text-text-primary">{user._count.posts}</p>
              <p className="text-xs text-text-muted">Posts</p>
            </div>
            <button
              type="button"
              data-followers
              disabled={!canViewConnections}
              className={`text-center ${canViewConnections ? "cursor-pointer hover:text-accent" : "cursor-not-allowed opacity-70"}`}
            >
              <p className="font-heading text-lg font-bold text-text-primary">{user._count.followers}</p>
              <p className="text-xs text-text-muted">Followers</p>
            </button>
            <button
              type="button"
              data-following
              disabled={!canViewConnections}
              className={`text-center ${canViewConnections ? "cursor-pointer hover:text-accent" : "cursor-not-allowed opacity-70"}`}
            >
              <p className="font-heading text-lg font-bold text-text-primary">{user._count.following}</p>
              <p className="text-xs text-text-muted">Following</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
