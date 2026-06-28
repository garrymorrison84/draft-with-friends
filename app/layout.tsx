import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Draft With Friends",
  description: "Create sports pools, draft with friends, and track live standings.",
  icons: {
    icon: [
      { url: "/dwf-favicon.svg", type: "image/svg+xml" },
      { url: "/dwf-icon.png", sizes: "195x96", type: "image/png" },
      { url: "/dwf-logo.png", type: "image/png" },
    ],
    apple: [{ url: "/dwf-icon.png", sizes: "195x96", type: "image/png" }],
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
