import type { Metadata, Viewport } from "next";
import { Creepster, Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { Suspense } from "react";
import { UserProvider } from "@/lib/user";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif-display", subsets: ["latin"] });
const spooky = Creepster({ variable: "--font-spooky-display", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Don't Ghost",
  description: "Your agents keep your friendships from fading.",
};

export const viewport: Viewport = { themeColor: "#13100f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} ${spooky.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <UserProvider>{children}</UserProvider>
        </Suspense>
      </body>
    </html>
  );
}
