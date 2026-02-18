import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="relative pb-16 pt-20 md:pt-24">
        {/* Background Effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-20 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Welcome Card */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            {/* Gradient Header */}
            <div className="relative h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTJ2LTZoLTR2NmgtMnYtNmgtNHY2aC0ydi02aC00djZIOHYtNkg0djZIMnYtNkgwVjBoNjB2MzRIMzZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            </div>

            <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
              {/* Avatar */}
              <div className="-mt-10 mb-6 md:-mt-12">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User avatar"}
                    className="h-24 w-24 rounded-2xl border-4 border-gray-950 object-cover shadow-xl"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-gray-950 bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-xl">
                    {initials}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">
                  Welcome back, {user.name || "User"}!
                </h1>
                <p className="mt-1 text-sm text-gray-400">{user.email}</p>
              </div>

              {/* Stats / Info Grid */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                    <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold text-white">Active</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                    <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="text-sm font-semibold text-white">Member</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                    <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">Auth Provider</p>
                  <p className="text-sm font-semibold text-white">
                    {user.image ? "OAuth" : "Email"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Session Debug (dev only) */}
          <details className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-gray-300">
              Session Details (debug)
            </summary>
            <pre className="mt-4 overflow-auto rounded-xl bg-black/50 p-4 text-xs text-gray-400">
              {JSON.stringify(session, null, 2)}
            </pre>
          </details>
        </div>
      </main>
    </div>
  );
}
