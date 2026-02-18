import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${playfair.variable} ${dmSans.variable} font-body antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1A1916",
              color: "#F0EBE1",
              border: "1px solid #2E2C28",
              fontFamily: "var(--font-dmsans)",
            },
          }}
        />
      </body>
    </html>
  );
}
