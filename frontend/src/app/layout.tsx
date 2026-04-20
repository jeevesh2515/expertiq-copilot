import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ExpertIQ Copilot — AI Expert Discovery Platform",
  description:
    "Discover the right experts for any research query using semantic search, knowledge graphs, and AI-powered re-ranking. Built for expert networks and research teams.",
  keywords: [
    "expert network",
    "AI search",
    "semantic search",
    "knowledge graph",
    "expert discovery",
    "research intelligence",
  ],
  openGraph: {
    title: "ExpertIQ Copilot",
    description: "AI-Powered Expert Discovery & Research Intelligence",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased text-stone-900`}>
        {children}
      </body>
    </html>
  );
}
