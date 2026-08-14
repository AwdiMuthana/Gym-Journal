import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import ThemeSync from "./theme-sync";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gym Journal",
  description: "Log your workouts and track your progress.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym Journal",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#ec3013",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
