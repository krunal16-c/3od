import { PrismaClient, QuoteState, RfqState, UserRole } from '@prisma/client';
import { hashPassword } from './marketplace.store.js';
import { demoAccounts, demoPrinters, demoRfqs, demoVendorProfile } from './demo-seed-data.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Demo seed data cannot be created while NODE_ENV=production.');
}

const prisma = new PrismaClient();

async function seedUser(account: typeof demoAccounts.buyer | typeof demoAccounts.vendor, role: UserRole) {
  return prisma.user.upsert({
    where: { email: account.email },
    update: { displayName: account.name, role, passwordHash: hashPassword(account.password) },
    create: { email: account.email, displayName: account.name, role, passwordHash: hashPassword(account.password) }
  });
}

async function seed() {
  const buyer = await seedUser(demoAccounts.buyer, UserRole.BUYER);
  const vendorUser = await seedUser(demoAccounts.vendor, UserRole.PRINTER_OWNER);

  const vendor = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: { ...demoVendorProfile, serviceAreas: [...demoVendorProfile.serviceAreas], isPublished: true },
    create: { userId: vendorUser.id, ...demoVendorProfile, serviceAreas: [...demoVendorProfile.serviceAreas], isPublished: true }
  });

  for (const printerInput of demoPrinters) {
    const existingPrinter = await prisma.printer.findFirst({ where: { vendorId: vendor.id, name: printerInput.name } });
    if (existingPrinter) {
      await prisma.printer.update({ where: { id: existingPrinter.id }, data: { ...printerInput, technologies: [...printerInput.technologies], materials: [...printerInput.materials], isActive: true } });
    } else {
      await prisma.printer.create({ data: { vendorId: vendor.id, ...printerInput, technologies: [...printerInput.technologies], materials: [...printerInput.materials], isActive: true } });
    }
  }

  for (const rfqInput of demoRfqs) {
    const deadline = new Date(Date.now() + rfqInput.deadlineDays * 24 * 60 * 60 * 1000);
    const rfq = await prisma.rfq.upsert({
      where: { buyerId_idempotencyKey: { buyerId: buyer.id, idempotencyKey: rfqInput.idempotencyKey } },
      update: { title: rfqInput.title, description: rfqInput.description, quantity: rfqInput.quantity, material: rfqInput.material, deadline, state: RfqState.OPEN_FOR_QUOTES },
      create: { buyerId: buyer.id, idempotencyKey: rfqInput.idempotencyKey, title: rfqInput.title, description: rfqInput.description, quantity: rfqInput.quantity, material: rfqInput.material, deadline, state: RfqState.OPEN_FOR_QUOTES }
    });

    const existingQuote = await prisma.quote.findFirst({ where: { rfqId: rfq.id, supplierId: vendorUser.id } });
    const quoteData = { state: QuoteState.VISIBLE_TO_BUYER, totalAmountInr: Math.max(650, rfqInput.quantity * 120), currency: 'INR', deliveryDate: deadline, notes: 'Synthetic demo quote for testing the buyer comparison flow.' };
    if (existingQuote) await prisma.quote.update({ where: { id: existingQuote.id }, data: quoteData });
    else await prisma.quote.create({ data: { rfqId: rfq.id, supplierId: vendorUser.id, ...quoteData } });
  }

  const existingContact = await prisma.vendorContact.findFirst({ where: { vendorId: vendor.id, buyerId: buyer.id, message: { startsWith: '[Demo]' } } });
  if (!existingContact) {
    await prisma.vendorContact.create({ data: { vendorId: vendor.id, buyerId: buyer.id, message: '[Demo] I need 25 PETG brackets. Can you share an estimated price and lead time?', phone: '+919999999999' } });
  }

  console.log('Demo data is ready.');
  console.log(`Buyer:  ${demoAccounts.buyer.email} / ${demoAccounts.buyer.password}`);
  console.log(`Vendor: ${demoAccounts.vendor.email} / ${demoAccounts.vendor.password}`);
  console.log(`Vendor page: /vendors/${vendor.slug}`);
  console.log(`Vendor setup: /vendor`);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
