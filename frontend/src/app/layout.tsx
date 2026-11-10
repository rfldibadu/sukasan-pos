import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NextAuthProviders } from "@/main/providers/next-auth";
import AppShell from "@/main/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Sukasan POS",
  description: "Point of Sale system for Sukasan Coffee",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sukasan POS",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#b45309",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 antialiased suppressHydrationWarning">
        {/* Wrap everything that uses NextAuth hooks inside NextAuthProviders */}
        <NextAuthProviders>
          <AppShell>{children}</AppShell>
        </NextAuthProviders>
      </body>
    </html>
  );
}
