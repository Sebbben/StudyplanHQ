import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppHeader } from "@/components/layout/app-header";

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
  title: "StudyPlanHQ",
  description: "Course exploration and semester planning for UiO students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.22),_transparent_32%),linear-gradient(180deg,_#f8f4ec_0%,_#f5f3ef_35%,_#f2f1ee_100%)] text-stone-950">
        <div className="min-h-screen">
          <AppHeader />
          <main className="mx-auto w-full max-w-7xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
