import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReduxProvider } from "@/components/providers/ReduxProvider";
import { GleapProvider } from "@/components/providers/GleapProvider";
import { TelegramProvider, TelegramGuard } from "@/components/telegram";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DVENTURES",
  description: "Healthcare Management System for Ayurveda Clinics & Hospitals",
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <TelegramProvider>
          <TelegramGuard>
            <ReduxProvider>
              <GleapProvider>
                {children}
              </GleapProvider>
            </ReduxProvider>
          </TelegramGuard>
        </TelegramProvider>
      </body>
    </html>
  );
}
