"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { updateProfileSettings } from "@/app/actions/settings";
import { ThemeToggle } from "@/components/ThemeToggle";

type SettingsClientProps = {
  initial: {
    id: string;
    name: string | null;
    email: string | null;
    username: string;
    isPrivate: boolean;
  };
};

export default function SettingsClient({ initial }: SettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState(initial.username);
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate);

  function handleSave() {
    startTransition(async () => {
      try {
        const result = await updateProfileSettings({ username, isPrivate });
        toast.success("Settings updated");
        router.replace(`/profile/${result.username}`);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update settings";
        toast.error(message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Manage your username and account privacy.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-bg-surface p-4 sm:p-5">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Appearance
            </label>
            <ThemeToggle />
            <p className="mt-1 text-xs text-text-muted">
              Default is System and follows your device appearance.
            </p>
          </div>

          <div>
            <p className="text-sm text-text-muted">Name</p>
            <p className="text-sm font-medium text-text-primary">
              {initial.name || "Unnamed"}
            </p>
          </div>

          <div>
            <p className="text-sm text-text-muted">Email</p>
            <p className="text-sm font-medium text-text-primary">
              {initial.email || "No email"}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="username"
              className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
            <p className="mt-1 text-xs text-text-muted">
              Use lowercase letters, numbers, and underscore.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-bg p-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border bg-bg text-accent focus:ring-accent"
              />
              <span>
                <span className="block text-sm font-medium text-text-primary">
                  Private account
                </span>
                <span className="block text-xs text-text-muted">
                  Only followers can view your posts when this is enabled.
                </span>
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="h-11 rounded-lg bg-accent px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
