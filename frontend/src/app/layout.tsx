import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Knowledge Assistant",
  description:
    "Upload documents and get AI-powered answers to your questions",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-text-primary`}
      >
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#16161f",
                color: "#f8fafc",
                border: "1px solid #2a2a3a",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#f8fafc",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#f8fafc",
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

