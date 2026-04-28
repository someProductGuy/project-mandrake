import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/ui/AuthProvider";
import Navbar from "@/components/ui/Navbar";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Demeter",
  description: "Track the care and maintenance of your houseplant collection",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Demeter" },
};

export const viewport: Viewport = {
  themeColor: "#2D5C34",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink font-body">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
