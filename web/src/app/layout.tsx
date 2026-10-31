import type { Metadata, Viewport } from "next";
import { Geist_Mono, Grandstander, Nunito_Sans } from "next/font/google";
import { Suspense } from "react";
import { UserProvider } from "@/lib/user";
import "./globals.css";

const display = Grandstander({ variable: "--font-display", subsets: ["latin"], weight: ["600", "800"] });
const body = Nunito_Sans({ variable: "--font-body", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Don't Ghost Me",
  description: "Your agents keep your friendships from fading.",
};

export const viewport: Viewport = { themeColor: "#0d0709", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <UserProvider>{children}</UserProvider>
        </Suspense>
      </body>
    </html>
  );
}
