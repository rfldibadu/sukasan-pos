"use client";

import { SessionProvider } from "next-auth/react";

export function NextAuthProviders({ children }:
    Readonly<{
    children: React.ReactNode
}>) {
  return (
        <SessionProvider
            refetchInterval={0}
            refetchOnWindowFocus={false}
        >
            {children}
        </SessionProvider>
    
    );
}