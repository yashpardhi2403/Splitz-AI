import {Inter} from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Splitz-AI",
  description: "AI powered expense tracker and splitting app",
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* icon for the website - can be changed to any image */}
        <link rel="icon" href="/logos/logo-s.png" sizes="any"/>
      </head>
      <body className={`${inter.className} antialiased`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <Header/>
            <main className="min-h-screen">
              {children}
              <Toaster richColors/>
          </main>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
