import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";
import localfont from "next/font/local";
import "./globals.css";

const rethinkSans = Rethink_Sans({
  variable: "--font-rethink-sans",
  subsets: ["latin"],
});

const satoshi = localfont({
  src: "./fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "momentm",
  description: "A Fitness App that gives you Unfair Advantage!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rethinkSans.variable} ${satoshi.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
