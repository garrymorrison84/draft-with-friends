import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.draftwithfriends.com"),
  title: {
    default: "Draft With Friends",
    template: "%s | Draft With Friends",
  },
  description:
    "Create private sports pools, run snake drafts with friends, and track live standings for college football and golf.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Draft With Friends",
    description:
      "Private snake drafts and live scoring for college football, golf, and more friend-group sports pools.",
    url: "https://www.draftwithfriends.com",
    siteName: "Draft With Friends",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Draft With Friends",
    description:
      "Private snake drafts and live scoring for college football, golf, and more friend-group sports pools.",
  },
  icons: {
    icon: [
      { url: "/dwf-favicon-clean.svg", type: "image/svg+xml" },
      { url: "/dwf-icon.png", sizes: "180x180", type: "image/png" },
    ],
    apple: [{ url: "/dwf-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="border-t border-white/5 bg-[#030712] px-6 py-8 text-sm text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold">&copy; 2026 Draft With Friends</p>
              <nav className="flex flex-wrap gap-4 font-semibold">
                <a href="mailto:support@draftwithfriends.com" className="hover:text-emerald-300">
                  Contact Support
                </a>
                <Link href="/privacy" className="hover:text-emerald-300">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-emerald-300">
                  Terms of Service
                </Link>
              </nav>
            </div>
            <p className="max-w-4xl text-xs font-semibold leading-5 text-slate-600">
              Draft With Friends is an independent platform and is not affiliated with,
              endorsed by, sponsored by, or officially connected with the NCAA, PGA TOUR,
              The R&amp;A, PGA of America, NFL, MLB, NBA, NHL, any conference, school,
              team, tournament, event operator, league, tour, or governing body.
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
