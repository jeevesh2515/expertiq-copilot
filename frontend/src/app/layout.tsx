import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0C0C0F",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "ExpertIQ Copilot — AI-Powered Expert Discovery Platform",
  description:
    "Discover the right experts for any research query using semantic search, knowledge graphs, and AI-powered re-ranking. Built for expert networks and research teams.",
  keywords: [
    "expert network",
    "AI search",
    "semantic search",
    "knowledge graph",
    "expert discovery",
    "research intelligence",
    "AI copilot",
    "expert matching",
  ],
  authors: [{ name: "ExpertIQ" }],
  robots: "index, follow",
  openGraph: {
    title: "ExpertIQ Copilot — AI Expert Discovery",
    description:
      "Three-layer AI retrieval: semantic search, knowledge graphs, and LLM re-ranking to deliver the highest quality expert matches.",
    type: "website",
    siteName: "ExpertIQ Copilot",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExpertIQ Copilot",
    description: "AI-Powered Expert Discovery & Research Intelligence",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        style={{
          fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
        }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
