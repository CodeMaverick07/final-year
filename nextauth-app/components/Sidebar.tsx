"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const pathname = usePathname();

  const links = [
    { href: "/feed", label: "Feed", icon: <FeedIcon /> },
    { href: "/capture", label: "Capture", icon: <CaptureIcon /> },
    { href: "/record", label: "Record", icon: <RecordIcon /> },
    { href: "/upload", label: "Upload", icon: <UploadIcon /> },
    { href: "/profile", label: "Profile", icon: <ProfileIcon /> },
    { href: "/saved", label: "Saved", icon: <SavedIcon /> },
  ];

  const initials = (user.name || user.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-bg-surface hidden md:flex flex-col">
      {/* Logo Area */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/feed" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
            <svg
              className="h-5 w-5 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <span className="font-heading text-lg font-semibold text-text-primary">
            Sanskriti
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:bg-white/[0.03] hover:text-text-primary"
              }`}
            >
              <span className={isActive ? "text-accent" : "text-text-muted/70 group-hover:text-text-primary"}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          {user.image ? (
            <img
              src={user.image}
              alt="Avatar"
              className="h-9 w-9 rounded-full ring-1 ring-border object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
              {initials}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-text-primary">
              {user.name || "User"}
            </p>
            <p className="truncate text-xs text-text-muted">
              {user.email}
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          className="mb-2 flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Settings
        </Link>
        <div className="mb-2">
          <ThemeToggle compact />
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}

// Icons
function FeedIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function SavedIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5A2.25 2.25 0 0 1 8.25 5.25h7.5A2.25 2.25 0 0 1 18 7.5v12.75L12 17.25 6 20.25V7.5Z" />
    </svg>
  );
}

function CaptureIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  );
}

function RecordIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  );
}
