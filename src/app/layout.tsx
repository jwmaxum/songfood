import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AppProviders } from '@/components/providers/AppProviders';
import CartDrawer from '@/components/cart/CartDrawer';

// Header, footer, catalog and CMS pages read live Supabase data.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: '송영민푸드 (Song Youngmin Food) | Premium K-Food, Korea Food & K-Fresh Food',
  description:
    '송영민푸드(Song Youngmin Food) 공식 몰. K-Food, Korea Food, K-Fresh Food, 대한민국 대표 K-냉동식품(비비고 왕교자, 떡볶이, 치킨) 및 프리미엄 K-주류/전통주(원소주, 생막걸리) 24시간 프레시 에어 배송.',
  keywords: [
    'K-Food',
    'Korea Food',
    'K-Fresh Food',
    '송영민푸드',
    'Song Youngmin Food',
    'K-Frozen Food',
    'K-Liquor',
    '원소주',
    '비비고만두',
    '생막걸리',
    '전통주',
    '떡볶이 밀키트',
  ],
  openGraph: {
    title: '송영민푸드 | Song Youngmin Food - Premium K-Food & Korea Food',
    description: '대한민국 대표 프리미엄 K-Food, Korea Food, K-Fresh Food 및 K-주류 전문 몰',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400;1,9..40,700&family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: '송영민푸드 (Song Youngmin Food)',
              url: 'https://www.anatolia.com',
              logo: '/logo.png',
              description: 'K-Food, Korea Food, K-Fresh Food Premium Marketplace',
            }),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#FAFAF8] text-stone-800 antialiased selection:bg-[#14532D] selection:text-white">
        <AppProviders>
          {/* RSC Header with Active Menu Engine & Multi-language Selector */}
          <Header />
          <CartDrawer />
          <main className="flex-grow">{children}</main>
          {/* RSC Footer */}
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
