import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght-italic.css";
import "@fontsource-variable/bitter/wght.css";
import "@fontsource-variable/bitter/wght-italic.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const description = "Turn any job description into a focused, evidence-backed interview preparation plan.";
  return {
    title: "MockMate — Evidence wins interviews",
    description,
    openGraph: { title: "MockMate — Evidence wins interviews", description, images: [{ url: image, width: 1731, height: 909, alt: "MockMate candidate analysis and evidence preview" }] },
    twitter: { card: "summary_large_image", title: "MockMate — Evidence wins interviews", description, images: [image] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
