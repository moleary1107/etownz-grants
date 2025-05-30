import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "eTownz Grants - AI-Powered Grant Discovery for Ireland",
  description: "Discover and apply for grants in Ireland 10x faster with our AI-powered platform. Automatically find relevant opportunities from Enterprise Ireland, SFI, councils, and EU sources.",
  keywords: ["grants", "ireland", "AI", "automation", "enterprise ireland", "funding", "SFI", "council grants"],
  authors: [{ name: "eTownz", url: "https://etownz.ie" }],
  creator: "eTownz",
  publisher: "eTownz",
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
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "eTownz Grants",
  },
  openGraph: {
    type: "website",
    locale: "en_IE",
    url: "https://grants.etownz.ie",
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
    <html lang="en-IE" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="application-name" content="eTownz Grants" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="eTownz Grants" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="mask-icon" href="/icons/icon-base.svg" color="#2563eb" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="eTownz Grants" />
        <meta name="twitter:description" content="AI-Powered Grant Discovery for Ireland" />
        <meta name="twitter:image" content="/icons/icon-192x192.png" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="eTownz Grants" />
        <meta property="og:description" content="AI-Powered Grant Discovery for Ireland" />
        <meta property="og:site_name" content="eTownz Grants" />
        <meta property="og:image" content="/icons/icon-512x512.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <div id="root" className="relative min-h-screen">
          {children}
        </div>
        <div id="modal-root" />
      </body>
    </html>
  );
}
