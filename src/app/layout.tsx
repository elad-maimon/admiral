import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

const font = Assistant({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "Admiral - Product Management System",
  description: "Internal product management system connecting business goals to product execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={font.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
