import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";

import { FirebaseAnalytics } from "@/components/shared/firebase-analytics";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXTAUTH_URL ??
      "http://localhost:3000"
  ),
  title: "Premium Commerce",
  description: "A premium ecommerce experience built with Next.js.",
  openGraph: {
    title: "Premium Commerce",
    description: "A premium ecommerce experience built with Next.js.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium Commerce",
    description: "A premium ecommerce experience built with Next.js.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <FirebaseAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
