import type { MetadataRoute } from 'next';
import { blogPosts } from './content/blog';
import { manufacturingLandingPages } from './content/manufacturing';

const baseUrl = 'https://3od.zesterproductstudio.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/for-buyers', '/for-printer-owners', '/how-it-works', '/manufacturing', '/blog', '/contact', ...['privacy', 'terms', 'cancellation-and-refunds', 'file-ownership', 'acceptable-use'].map((slug) => `/policies/${slug}`)];
  return [
    ...pages.map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date('2026-09-30') })),
    ...manufacturingLandingPages.map((page) => ({ url: `${baseUrl}/manufacturing/${page.slug}`, lastModified: new Date('2026-10-08') })),
    ...blogPosts.map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: new Date(post.datePublished) })),
  ];
}
