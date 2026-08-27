import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", baseUrl).toString();

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
