import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: "3oD — India's 3D Printing Marketplace", template: '%s | 3oD' },
  description:
    'Upload your 3D design and compare quotes from independent 3D-printing providers across India.',
  metadataBase: new URL('https://3od.in'),
  alternates: { canonical: '/' },
  openGraph: {
    title: "3oD — India's 3D Printing Marketplace",
    description: 'Your design. Real quotes. Made in India.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
