import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/providers/toast-provider";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const description = "Termine planen, Zusagen sammeln und Mitglieder verwalten – die schlichte Team-App für Sportteams.";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Smartrain",
  title: {
    default: "Smartrain",
    template: "%s | Smartrain"
  },
  description,
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "de_CH",
    url: siteUrl,
    siteName: "Smartrain",
    title: "Smartrain",
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Smartrain – Team-Management & Training" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Smartrain",
    description,
    images: ["/og.png"]
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
