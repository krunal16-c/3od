import { describe, expect, it } from 'vitest';
import { getManufacturingLandingPage, manufacturingDirectory, manufacturingLandingPages } from './manufacturing';

describe('manufacturing SEO content', () => {
  it('only links live capabilities from the directory', () => {
    expect(manufacturingDirectory.find((entry) => entry.name === '3D printing')?.live).toBe(true);
    expect(manufacturingDirectory.find((entry) => entry.name.startsWith('CNC'))?.live).toBe(false);
  });

  it('has unique metadata and canonical slugs for every landing page', () => {
    const slugs = manufacturingLandingPages.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(manufacturingLandingPages.every((page) => page.title && page.description && page.faqs.length > 0)).toBe(true);
  });

  it('does not expose an unlisted process page', () => {
    expect(getManufacturingLandingPage('cnc-milling-india')).toBeUndefined();
  });
});
