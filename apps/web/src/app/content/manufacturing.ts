export type ManufacturingLandingPage = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  intro: string;
  availability: 'available' | 'coming_next' | 'planned';
  process: string;
  materials: string[];
  useCases: string[];
  faqs: Array<{ question: string; answer: string }>;
};

export const manufacturingLandingPages: ManufacturingLandingPage[] = [
  {
    slug: '3d-printing-india',
    title: '3D printing services across India',
    metaTitle: '3D Printing Services in India | 3oD',
    description:
      'Upload a CAD file and compare real 3D printing quotes from independent manufacturing partners across India.',
    eyebrow: 'Available now · 3D printing',
    intro:
      'Turn a CAD file into a physical part without buying a printer. 3oD helps you share the right brief, compare real quotes, and choose a 3D-printing partner for prototypes, replacement parts, and small batches across India.',
    availability: 'available',
    process: '3D printing',
    materials: ['PLA', 'PETG', 'ABS', 'Resin'],
    useCases: ['Functional prototypes', 'Replacement parts', 'Jigs and fixtures', 'Cosplay and hobby models'],
    faqs: [
      {
        question: 'What files can I upload for a 3D-printing quote?',
        answer: '3oD currently accepts STL, OBJ, STEP, STP, and 3MF design files for quote requests.',
      },
      {
        question: 'Can I request just one 3D-printed part?',
        answer: 'Yes. Buyers can request a single part or a small batch, subject to the manufacturing partner’s minimum order quantity.',
      },
      {
        question: 'Is CNC machining available on 3oD today?',
        answer: 'CNC milling and turning are coming next. They are listed as future capabilities and cannot currently be selected for a live 3oD quote.',
      },
    ],
  },
  {
    slug: 'materials/pla-3d-printing',
    title: 'PLA 3D printing for prototypes and everyday parts',
    metaTitle: 'PLA 3D Printing in India | 3oD',
    description:
      'Learn when PLA is a practical choice for prototypes, enclosures, models, and low-stress parts, then request a real quote in India.',
    eyebrow: 'Material guide · PLA',
    intro:
      'PLA is a practical starting point for visual prototypes, enclosures, models, and low-stress parts. Share your design and intended use so a 3oD manufacturing partner can quote the material, lead time, and delivery details together.',
    availability: 'available',
    process: 'PLA 3D printing',
    materials: ['PLA', 'PLA+', 'Silk PLA', 'Wood-filled PLA'],
    useCases: ['Visual prototypes', 'Product mock-ups', 'Educational models', 'Low-stress enclosures'],
    faqs: [
      {
        question: 'When should I choose PLA?',
        answer: 'PLA is a good fit for visual prototypes and low-stress parts where easy printing, crisp detail, and a wide colour range matter more than high heat resistance.',
      },
      {
        question: 'Is PLA suitable for outdoor or high-heat use?',
        answer: 'Usually not. Share the operating temperature, sunlight exposure, and loads in your brief so the partner can recommend a more suitable material when needed.',
      },
      {
        question: 'How do I get a PLA quote?',
        answer: 'Create a buyer account, upload your design, select PLA, and describe the quantity, finish, deadline, and any critical dimensions.',
      },
    ],
  },
];

export const manufacturingDirectory = [
  { slug: '3d-printing-india', name: '3D printing', status: 'Available now', live: true },
  { slug: null, name: 'CNC milling and turning', status: 'Coming next', live: false },
  { slug: null, name: 'Laser cutting and engraving', status: 'Coming next', live: false },
  { slug: null, name: 'Sheet-metal fabrication', status: 'Planned', live: false },
] as const;

export function getManufacturingLandingPage(slug: string) {
  return manufacturingLandingPages.find((page) => page.slug === slug);
}
