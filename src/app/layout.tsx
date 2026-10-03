import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavigationBar } from "@/component/NavigationBar";
import { ToastProvider } from "@/component/Toast";
import { AuthProvider } from "@/component/Auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ICT SBA App",
  description: "ICT SBA Project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{display: "flex", flexDirection: 'column', minHeight: "100vh"}}
      >
        <ToastProvider>
          <AuthProvider>
            <NavigationBar/>
            <div style={{flex: 1, display: "flex", flexDirection: "column", width: "100%"}}>
              {children}
            </div>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
