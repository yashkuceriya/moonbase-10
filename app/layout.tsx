import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const PRODUCTION_ORIGIN = "https://moonbase-10.yashv10k.chatgpt.site";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("host") ?? "localhost:3000").toLowerCase();
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const baseUrl = new URL(isLocal ? `http://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_ORIGIN));
  const socialImage = new URL("/og.jpg", baseUrl).toString();

  return {
    title: "Moonbase 10 — Adaptive Math Adventure",
    description: "A K–5 math game where every mistake maps the learner’s next mission.",
    metadataBase: baseUrl,
    openGraph: {
      title: "Moonbase 10",
      description: "Every mistake maps the next mission.",
      images: [{ url: socialImage, width: 1732, height: 908, alt: "Moonbase 10 adaptive math adventure" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Moonbase 10",
      description: "Every mistake maps the next mission.",
      images: [socialImage],
    },
    icons: { icon: "/favicon.png", shortcut: "/favicon.png" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
