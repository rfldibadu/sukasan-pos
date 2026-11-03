import "./globals.css";
import { NextAuthProviders } from "@/main/providers/next-auth";
import AppShell from "@/main/components/layout/app-shell";

export const metadata = {
  title: "Sukasan POS",
  description: "Point of Sale system for Sukasan Coffee",
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
