import { auth } from "@/auth";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedContentPadding } from "@/components/ProtectedContentPadding";
import { ProtectedMobileChrome } from "@/components/ProtectedMobileChrome";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar for Desktop */}
      {session?.user && (
        <Sidebar
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          }}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64">
        <ProtectedMobileChrome />
        <ProtectedContentPadding>
          {children}
        </ProtectedContentPadding>
      </div>
    </div>
  );
}
