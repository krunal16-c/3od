import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Metadata } from 'next';
import sitemap from './sitemap';
import robots from './robots';
import { metadata as buyersMetadata } from './for-buyers/page';
import { metadata as supplierMetadata } from './for-printer-owners/page';
import { metadata as howItWorksMetadata } from './how-it-works/page';
import { metadata as joinMetadata } from './join-as-supplier/page';
import { metadata as requestQuoteMetadata } from './request-quote/page';
import { metadata as contactMetadata } from './contact/page';
import { metadata as manufacturingMetadata } from './manufacturing/page';
import { metadata as blogMetadata } from './blog/page';
import { blogPosts } from './content/blog';
import { manufacturingDirectory, manufacturingLandingPages } from './content/manufacturing';

const siteOrigin = 'https://3od.zesterproductstudio.com';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('growth and SEO contracts', () => {
  it('keeps the public sitemap unique, canonical, and free of private routes', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((url) => url.startsWith(`${siteOrigin}/`) || url === siteOrigin)).toBe(true);
    expect(urls).not.toEqual(expect.arrayContaining([
      `${siteOrigin}/dashboard/buyer`,
      `${siteOrigin}/dashboard/owner`,
      `${siteOrigin}/login`,
      `${siteOrigin}/request-quote`,
    ]));
    expect(urls).toContain(`${siteOrigin}/manufacturing/3d-printing-india`);
    expect(urls).not.toContain(`${siteOrigin}/manufacturing/cnc-milling-india`);
  });

  it('publishes a crawlable robots policy with the same sitemap origin', () => {
    const policy = robots();
    const rule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    const disallow = rule?.disallow;

    expect(policy.sitemap).toBe(`${siteOrigin}/sitemap.xml`);
    expect(disallow).toEqual(expect.arrayContaining(['/dashboard/', '/request-quote', '/login', '/signup']));
  });

  it('gives every indexable acquisition page a useful title, description, and canonical path', () => {
    const pages = [
      buyersMetadata,
      supplierMetadata,
      howItWorksMetadata,
      joinMetadata,
      contactMetadata,
      manufacturingMetadata,
      blogMetadata,
    ];

    for (const metadata of pages) {
      expect(metadata.title).toBeTruthy();
      expect(metadata.description).toBeTruthy();
      expect(metadata.alternates?.canonical).toMatch(/^\//);
    }
  });

  it('keeps the RFQ route out of search while preserving its canonical route contract', () => {
    expect(requestQuoteMetadata.title).toBe('Request a Quote');
    expect(requestQuoteMetadata.alternates?.canonical).toBe('/request-quote');
    expect(requestQuoteMetadata.robots).toMatchObject({ index: false, follow: false });
  });

  it('does not create indexable landing pages for processes that are not live', () => {
    expect(manufacturingLandingPages.every((page) => page.availability === 'available')).toBe(true);
    expect(manufacturingLandingPages.every((page) => page.process.toLowerCase().includes('3d printing'))).toBe(true);
    expect(manufacturingLandingPages.some((page) => page.slug.includes('cnc'))).toBe(false);
    expect(manufacturingDirectory.filter((entry) => !entry.live).every((entry) => entry.slug === null)).toBe(true);
  });

  it('keeps blog content publishable with practical metadata and internal workflow content', () => {
    expect(blogPosts.length).toBeGreaterThanOrEqual(3);
    expect(blogPosts.every((post) => post.title && post.description && post.datePublished && post.imageAlt)).toBe(true);
    expect(blogPosts.every((post) => post.sections.length > 0 && post.sections.every((section) => section.heading && section.paragraphs.length > 0))).toBe(true);
  });

  it('exposes the partnership contact destination without embedding private lead data', () => {
    const contactPage = source('./contact/page.tsx');

    expect(contactPage).toContain('mailto:partnerships@zesterproductstudio.com');
    expect(contactPage).not.toMatch(/password|session|token/i);
  });

  it('keeps the lead-capture form constrained to supported design files and validated basics', () => {
    const rfqForm = source('../components/rfq/rfq-form.tsx');

    expect(rfqForm).toContain('accept=".stl,.obj,.step,.stp,.3mf"');
    expect(rfqForm).toContain("file.size === 0");
    expect(rfqForm).toContain("quantity < 1");
    expect(rfqForm).toContain('role="alert"');
    expect(rfqForm).toContain("trackMarketingEvent('rfq_submitted'");
  });

  it('has mobile layout contracts for public cards, forms, and long contact addresses', () => {
    const styles = source('./globals.css');

    expect(styles).toContain('@media (max-width:760px)');
    expect(styles).toContain('.blog-grid { grid-template-columns:1fr');
    expect(styles).toContain('.contact-email {');
    expect(styles).toContain('overflow-wrap:anywhere');
    expect(styles).toContain('.landing-grid { grid-template-columns:1fr');
  });

  it('does not emit sensitive fields through marketing event payloads', () => {
    const analytics = source('../lib/marketing-events.ts');

    expect(analytics).not.toMatch(/password|session|authorization|fileContent|fileData/i);
  });
});
