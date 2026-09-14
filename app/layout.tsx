import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { ToastProvider } from "@/components/providers/toast-provider";
import { GradientWavesBackground } from "@/components/effects/gradient-waves-background";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const description = "Moderne Team-Management- und Trainings-App für Coaches, Spieler und Eltern.";
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap"
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
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
  themeColor: "#090d0f"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`dark ${sourceSans.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <GradientWavesBackground />
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
