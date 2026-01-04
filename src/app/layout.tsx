import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/providers/trpc-provider";
import AuthSessionProvider from "@/providers/session-provider";
import { RestaurantMenuProvider } from "@/contexts/RestaurantMenuContext";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://tightshippms.com'),
  title: {
    default: 'Tightship PMS - Sync Your Menus to Deliveroo & Uber Eats Automatically',
    template: '%s | Tightship PMS',
  },
  description:
    'Stop manually updating menus across Deliveroo, Uber Eats, and other platforms. Tightship automatically syncs your complete menu data—prices, descriptions, allergens, and availability—in one click. Free for single location.',
  keywords: [
    'menu management',
    'deliveroo menu sync',
    'uber eats menu sync',
    'restaurant menu software',
    'multi-platform menu management',
    'allergen tracking',
    'menu price sync',
    'loyverse integration',
    'restaurant POS integration',
    'delivery platform sync',
    'just eat menu management',
    'restaurant pricing software',
  ],
  authors: [{ name: 'Tightship' }],
  creator: 'Tightship',
  publisher: 'Tightship',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Tightship PMS - Sync Your Menus to Deliveroo & Uber Eats Automatically',
    description:
      'Stop manually updating menus. Automatically sync your complete menu data to all delivery platforms instantly. Free forever for single location.',
    url: 'https://tightshippms.com',
    siteName: 'Tightship PMS',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tightship PMS - Sync Menus to Deliveroo & Uber Eats',
    description:
      'Automatically sync your complete menu data to all delivery platforms. Free forever for single location.',
    creator: '@tightshipapp',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          <TRPCProvider>
            <RestaurantMenuProvider>
              {children}
            </RestaurantMenuProvider>
          </TRPCProvider>
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
