import "./globals.css";
import Navigation from "@/main/components/dashboard/navigations";

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
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col antialiased pb-20 
        md:pb-0 suppressHydrationWarning"
      >
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}