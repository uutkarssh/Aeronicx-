import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aeronicx — Fast. Free. No Ads.",
  description:
    "Aeronicx is a fast, free, ad-free video download site. Browse the catalog and download in one click — no redirects, no countdowns, no interstitials.",
  keywords: [
    "Aeronicx",
    "video downloads",
    "free videos",
    "no ads",
    "fast downloads",
    "direct download",
  ],
  authors: [{ name: "Aeronicx" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Aeronicx — Fast. Free. No Ads.",
    description:
      "Browse the catalog and download videos in one click — no redirects, no countdowns, no interstitials.",
    siteName: "Aeronicx",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aeronicx — Fast. Free. No Ads.",
    description:
      "Browse the catalog and download videos in one click — no redirects, no countdowns, no interstitials.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
