import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "nuuvi",
  description: "Collaborative roleplay and world-building platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <Suspense fallback={<div className="min-h-screen bg-[#e8eaee] dark:bg-neutral-950" />}>
              <AppShell>{children}</AppShell>
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}