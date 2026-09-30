import type { MetadataRoute } from 'next';
import { blogPosts } from './content/blog';

const baseUrl = 'https://3od.zesterproductstudio.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/for-buyers', '/for-printer-owners', '/how-it-works', '/blog'];
  return [
    ...pages.map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date('2026-09-30') })),
    ...blogPosts.map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: new Date(post.datePublished) })),
  ];
}
