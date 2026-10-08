import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/login',
        '/signup',
        '/request-quote',
        '/verify-email',
      ],
    },
    sitemap: 'https://3od.zesterproductstudio.com/sitemap.xml',
  };
}
