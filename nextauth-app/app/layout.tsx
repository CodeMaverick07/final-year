import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sanskriti — Manuscript Sharing & Digitization",
  description:
    "A social platform for sharing, preserving, and discovering manuscripts. Upload images, audio, and video of cultural artifacts.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInitScript = `
(() => {
  try {
    const key = "theme-preference";
    const stored = localStorage.getItem(key);
    const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = preference === "system" ? (systemDark ? "dark" : "light") : preference;
    const root = document.documentElement;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolved;
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C9A96E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sanskriti" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${playfair.variable} ${dmSans.variable} font-body antialiased`}
      >
        <PwaRegister />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgb(var(--bg-surface))",
              color: "rgb(var(--text-primary))",
              border: "1px solid rgb(var(--border))",
              fontFamily: "var(--font-dmsans)",
            },
          }}
        />
      </body>
    </html>
  );
}
