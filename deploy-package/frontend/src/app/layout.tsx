import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "eTownz Grants - AI-Powered Grant Discovery for Ireland",
  description: "Discover and apply for grants in Ireland 10x faster with our AI-powered platform. Automatically find relevant opportunities from Enterprise Ireland, SFI, councils, and EU sources.",
  keywords: ["grants", "ireland", "AI", "automation", "enterprise ireland", "funding", "SFI", "council grants"],
  authors: [{ name: "eTownz", url: "https://etownz.ie" }],
  creator: "eTownz",
  publisher: "eTownz",
  applicationName: "eTownz Grants",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "eTownz Grants",
  },
  other: {
    "msapplication-TileColor": "#2563eb",
    "msapplication-tap-highlight": "no",
  },
  openGraph: {
    type: "website",
    locale: "en_IE",
    url: "https://grants.etownz.com",
    siteName: "eTownz Grants",
    title: "eTownz Grants - AI-Powered Grant Discovery for Ireland",
    description: "Discover and apply for grants in Ireland 10x faster with our AI-powered platform",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "eTownz Grants Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "eTownz Grants - AI-Powered Grant Discovery for Ireland",
    description: "Discover and apply for grants in Ireland 10x faster with our AI-powered platform",
    images: ["/icons/icon-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' }
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IE" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <div id="root" className="relative min-h-screen">
          {children}
        </div>
        <div id="modal-root" />
      </body>
    </html>
  );
}
