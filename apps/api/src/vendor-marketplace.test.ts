import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from './main.js';

const password = 'correct horse battery staple';
function cookie(response: { headers: Record<string, string | string[] | number | undefined> }) {
  const value = response.headers['set-cookie'];
  const first = Array.isArray(value) ? value[0] : value;
  if (!first || typeof first !== 'string') throw new Error('Expected session cookie');
  return first.split(';', 1)[0] ?? '';
}

describe('vendor storefront and contact flow', () => {
  let app: NestFastifyApplication;
  beforeEach(async () => { process.env.MARKETPLACE_STORE = 'memory'; const created = await createApp(); app = created.app; await app.init(); });
  afterEach(async () => { await app.close(); delete process.env.MARKETPLACE_STORE; });

  it('lets a printer owner publish printers with MOQ and lets a buyer contact the vendor', async () => {
    const ownerSignup = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'vendor@example.com', password, name: 'Vendor Works', role: 'printer_owner' } });
    const ownerCookie = cookie(ownerSignup);
    const profile = await app.inject({ method: 'POST', url: '/vendor/profile', headers: { cookie: ownerCookie }, payload: { slug: 'vendor-works', businessName: 'Vendor Works', bio: 'Small-batch FDM printing', city: 'Bengaluru', state: 'Karnataka' } });
    expect(profile.statusCode).toBe(201);
    const printer = await app.inject({ method: 'POST', url: '/vendor/printers', headers: { cookie: ownerCookie }, payload: { name: 'Bambu Lab P1S', model: 'P1S', technologies: ['FDM'], materials: ['PLA', 'PETG'], processes: ['3d_printing'], minOrderQuantity: 5 } });
    expect(printer.statusCode).toBe(201);
    expect((JSON.parse(printer.body).printer as Record<string, unknown>).minOrderQuantity).toBe(5);

    const publicPage = await app.inject({ method: 'GET', url: '/vendors/vendor-works' });
    expect(publicPage.statusCode).toBe(200);
    expect(JSON.parse(publicPage.body).vendor).toMatchObject({ slug: 'vendor-works', businessName: 'Vendor Works' });
    expect(JSON.parse(publicPage.body).printers).toHaveLength(1);

    const buyerSignup = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'buyer@example.com', password, name: 'Buyer', role: 'buyer' } });
    const buyerCookie = cookie(buyerSignup);
    const contact = await app.inject({ method: 'POST', url: '/vendors/vendor-works/contact', headers: { cookie: buyerCookie }, payload: { message: 'Can you print 20 brackets?', phone: '9876543210' } });
    expect(contact.statusCode).toBe(201);
    expect(JSON.parse(contact.body).contact).toMatchObject({ message: 'Can you print 20 brackets?' });
  });

  it('does not let one vendor inspect another vendor quote data', async () => {
    const firstVendorSignup = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'first-vendor@example.com', password, name: 'First Vendor', role: 'printer_owner' } });
    const firstVendorCookie = cookie(firstVendorSignup);
    await app.inject({ method: 'POST', url: '/vendor/profile', headers: { cookie: firstVendorCookie }, payload: { slug: 'first-vendor', businessName: 'First Vendor' } });
    await app.inject({ method: 'POST', url: '/vendor/printers', headers: { cookie: firstVendorCookie }, payload: { name: 'First P1S', processes: ['3d_printing'] } });

    const secondVendorSignup = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'second-vendor@example.com', password, name: 'Second Vendor', role: 'printer_owner' } });
    const secondVendorCookie = cookie(secondVendorSignup);
    await app.inject({ method: 'POST', url: '/vendor/profile', headers: { cookie: secondVendorCookie }, payload: { slug: 'second-vendor', businessName: 'Second Vendor' } });
    await app.inject({ method: 'POST', url: '/vendor/printers', headers: { cookie: secondVendorCookie }, payload: { name: 'Second P1S', processes: ['3d_printing'] } });

    const buyerSignup = await app.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'quote-buyer@example.com', password, name: 'Quote Buyer', role: 'buyer' } });
    const buyerCookie = cookie(buyerSignup);
    const rfq = await app.inject({
      method: 'POST',
      url: '/rfqs',
      headers: { cookie: buyerCookie, 'idempotency-key': 'quote-visibility-rfq' },
      payload: { title: 'Private quote test', quantity: 1 },
    });
    const rfqId = (JSON.parse(rfq.body).rfq as { id: string }).id;
    await app.inject({ method: 'POST', url: `/rfqs/${rfqId}/quotes`, headers: { cookie: firstVendorCookie }, payload: { amountPaise: 250000, leadTimeDays: 4 } });

    const response = await app.inject({ method: 'GET', url: `/rfqs/${rfqId}/quotes`, headers: { cookie: secondVendorCookie } });

    expect(response.statusCode).toBe(403);
  });
});
