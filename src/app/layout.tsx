import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";

import { AppHeader } from "@/components/layout/app-header";
import { env } from "@/lib/env";
import faviconAsset from "@/static/studyplanhq-compass-favicon.svg";

import "./globals.css";

const bodySans = IBM_Plex_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displaySerif = Newsreader({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "StudyPlanHQ",
  description: "Course exploration and semester planning for UiO students.",
  metadataBase: new URL(env.APP_URL),
  icons: {
    icon: [{ url: faviconAsset.src, type: "image/svg+xml" }],
    shortcut: [faviconAsset.src],
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
      className={`${bodySans.variable} ${displaySerif.variable} ${bodyMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-stone-950">
        <div className="min-h-screen">
          <AppHeader />
          <main className="mx-auto w-full max-w-[90rem] px-5 py-8 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
