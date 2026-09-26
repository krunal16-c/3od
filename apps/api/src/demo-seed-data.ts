export const demoAccounts = {
  buyer: {
    email: 'buyer.demo@3od.in',
    password: 'DemoBuyer123!',
    name: 'Demo Buyer'
  },
  vendor: {
    email: 'vendor.demo@3od.in',
    password: 'DemoVendor123!',
    name: 'Demo Maker Studio'
  }
} as const;

export const demoVendorProfile = {
  slug: 'demo-maker-studio',
  businessName: 'Demo Maker Studio',
  bio: 'A Bengaluru workshop for reliable prototypes, functional parts, and small-batch production.',
  city: 'Bengaluru',
  state: 'Karnataka',
  serviceAreas: ['Bengaluru', 'Karnataka', 'Pan India']
} as const;

export const demoPrinters = [
  {
    name: 'Bambu Lab P1S',
    model: 'Enclosed FDM · 256mm build volume',
    technologies: ['FDM', 'Multi-colour'],
    materials: ['PLA', 'PETG', 'TPU'],
    minOrderQuantity: 1
  },
  {
    name: 'Bambu Lab X1 Carbon',
    model: 'Carbon-fibre capable · 256mm build volume',
    technologies: ['FDM', 'Engineering materials'],
    materials: ['ABS', 'ASA', 'PA-CF', 'PC'],
    minOrderQuantity: 5
  },
  {
    name: 'Resin Detail Station',
    model: 'High-detail resin printing for small parts',
    technologies: ['MSLA Resin'],
    materials: ['Standard resin', 'Tough resin'],
    minOrderQuantity: 2
  }
] as const;

export const demoRfqs = [
  {
    idempotencyKey: 'demo-rfq-enclosure-v1',
    title: 'Air quality sensor enclosure',
    description: 'A compact enclosure for an indoor air-quality sensor prototype.',
    quantity: 12,
    material: 'PETG',
    deadlineDays: 7
  },
  {
    idempotencyKey: 'demo-rfq-cable-clips-v1',
    title: 'Cable management clips',
    description: 'Small clips for a desk cable-management kit with a snug fit.',
    quantity: 50,
    material: 'PLA',
    deadlineDays: 10
  },
  {
    idempotencyKey: 'demo-rfq-phone-stand-v1',
    title: 'Flexible phone stand prototype',
    description: 'One flexible stand prototype with a wide phone-support base.',
    quantity: 3,
    material: 'TPU',
    deadlineDays: 5
  }
] as const;
