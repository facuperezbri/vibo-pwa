import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerProvider } from "@/components/notifications/service-worker-provider";

// Use Apple's SF Pro font family (system fonts)
// These are the native fonts on iOS/macOS
const fontSans = {
  variable: "--font-sans",
  style: "normal",
  weight: "400",
};

const fontMono = {
  variable: "--font-mono",
  style: "normal",
  weight: "400",
};

export const metadata: Metadata = {
  title: "PadelTracker",
  description: "Track your padel matches, calculate ELO rankings, and compete with friends",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PadelTracker",
  },
  icons: {
    icon: [
      { url: "/icon-192.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${fontSans.variable} ${fontMono.variable} antialiased min-h-screen bg-background`}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
        }}
      >
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}

