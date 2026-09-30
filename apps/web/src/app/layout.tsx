import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: "3oD by Zester Product Studio — India's Digital Manufacturing Marketplace", template: '%s | 3oD' },
  description:
    'Upload a CAD design and compare quotes for 3D printing, CNC machining, laser cutting, and digital manufacturing across India.',
  metadataBase: new URL('https://3od.zesterproductstudio.com'),
  alternates: { canonical: '/' },
  openGraph: {
    title: "3oD by Zester Product Studio — India's Digital Manufacturing Marketplace",
    description: 'Your design. Real quotes. Made in India.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
