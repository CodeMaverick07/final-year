import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./ThemeToggle";

export default async function Navbar() {
  const session = await auth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border glass-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
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

          {/* Navigation */}
          <div className="flex items-center gap-1">
            {session?.user ? (
              <>
                <div className="hidden items-center gap-1 md:flex">
                  <Link
                    href="/feed"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
                  >
                    Feed
                  </Link>
                  <Link
                    href="/upload"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
                  >
                    Upload
                  </Link>
                  <Link
                    href="/profile"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
                  >
                    Settings
                  </Link>

                  <div className="ml-2 flex items-center gap-2 rounded-full border border-border bg-bg-surface py-1.5 pl-3 pr-1.5">
                    <span className="text-sm text-text-muted">
                      {session.user.name || session.user.email}
                    </span>
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt="Avatar"
                        className="h-7 w-7 rounded-full ring-1 ring-accent/50"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                        {(session.user.name || session.user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <SignOutButton />
                </div>

                <div className="flex items-center gap-2 md:hidden">
                  <Link
                    href="/feed"
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-muted"
                  >
                    Feed
                  </Link>
                  <Link
                    href="/upload"
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-muted"
                  >
                    Upload
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden md:block">
                  <ThemeToggle compact />
                </div>
                <Link
                  href="/login"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-all hover:bg-accent/90"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
