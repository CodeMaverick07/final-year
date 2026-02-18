import { auth } from "@/auth";
import { Sidebar } from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

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
        {/* Mobile Navbar (optional, hides on desktop via CSS if needed, but for now we keep global layout clean) */}
        {/* Actually, let's include the mobile navbar logic here if we wanted, 
            but the original Navbar component is responsive. 
            For this implementation, let's HIDE the global Navbar on desktop inside this layout 
            if we manipulate styles, or we can just render a mobile-only top bar.
            
            However, simpler approach: The Sidebar handles desktop. 
            For mobile, we might still want a top bar. 
            Let's reuse the existing Navbar for mobile but hide it on desktop?
            Actually, the existing Navbar has desktop links too.
            
            Let's render a Mobile-only header here for small screens.
        */}
        <div className="md:hidden">
          <Navbar /> 
        </div>

        <main className="min-h-screen w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
