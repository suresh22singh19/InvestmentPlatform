import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/components/providers/ReduxProvider";
import { GleapProvider } from "@/components/providers/GleapProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HIIMS - Jeena Sikho",
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
      <body className={`${inter.variable} antialiased`}>
        <ReduxProvider>
          <GleapProvider>
            {children}
          </GleapProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
