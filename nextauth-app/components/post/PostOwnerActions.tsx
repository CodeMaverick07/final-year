"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import TagInput from "@/components/upload/TagInput";
import VisibilityToggle from "@/components/upload/VisibilityToggle";
import { deletePost, updatePostDetails } from "@/app/actions/post";

type EditablePost = {
  title: string;
  subtitle: string | null;
  caption: string | null;
  isPublic: boolean;
  tags: string[];
};

type PostOwnerActionsProps = {
  postId: string;
  initial: EditablePost;
  onUpdated: (post: EditablePost) => void;
};

export function PostOwnerActions({
  postId,
  initial,
  onUpdated,
}: PostOwnerActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "");
  const [caption, setCaption] = useState(initial.caption ?? "");
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [tags, setTags] = useState<string[]>(initial.tags);

  useEffect(() => {
    if (!isEditOpen) return;
    setTitle(initial.title);
    setSubtitle(initial.subtitle ?? "");
    setCaption(initial.caption ?? "");
    setIsPublic(initial.isPublic);
    setTags(initial.tags);
  }, [initial, isEditOpen]);

  function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updatePostDetails(postId, {
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          caption: caption.trim() || null,
          isPublic,
          tags,
        });

        onUpdated(result.post);
        setIsEditOpen(false);
        toast.success("Post updated");
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update post";
        toast.error(message);
      }
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      "Delete this post permanently? This cannot be undone."
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deletePost(postId);
        toast.success("Post deleted");
        router.replace("/profile");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete post";
        toast.error(message);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          disabled={isPending}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-md border border-like-red/50 px-3 py-1.5 text-xs font-medium text-like-red transition-colors hover:bg-like-red/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <Modal open={isEditOpen} onOpenChange={setIsEditOpen} title="Edit Post">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Tags</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Visibility</label>
            <VisibilityToggle isPublic={isPublic} onChange={setIsPublic} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              disabled={isPending}
              className="rounded-md border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
