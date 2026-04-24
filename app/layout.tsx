import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "RAG Chatbot Demo — Tanvir Tuhin",
  description: "GPT-powered customer support chatbot with RAG (Retrieval-Augmented Generation). Demo by Tanvir Tuhin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
