export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  readTime: string;
  category: string;
  image: string;
  imageAlt: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-to-get-a-3d-printed-part-made-in-india',
    title: 'How to Get a 3D-Printed Part Made in India',
    description:
      'A practical guide to preparing your CAD file, choosing a material, comparing quotes, and getting a 3D-printed part delivered in India.',
    datePublished: '2026-09-30',
    readTime: '6 min read',
    category: 'Buyer guide',
    image: 'https://images.unsplash.com/photo-1633412802994-5c058f151b66?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Close-up of a 3D printer producing a part',
    intro:
      'Getting a one-off prototype or replacement part made should not require a factory-sized order. With a clean CAD file and a clear brief, you can compare practical options and choose a production partner with confidence.',
    sections: [
      {
        heading: 'Start with the right file',
        paragraphs: [
          'Export your design as STL or 3MF for 3D printing. Check that the model is watertight, has the correct scale, and does not contain loose surfaces or accidental duplicate geometry.',
          'Add a drawing or screenshots when dimensions, tolerances, threads, or assembly orientation matter. A few minutes of context can prevent an expensive misunderstanding.',
        ],
      },
      {
        heading: 'Choose material and finish deliberately',
        paragraphs: [
          'PLA works well for visual prototypes and low-stress parts. PETG is a useful step up for everyday functional parts, while flexible or engineering materials suit more specific requirements.',
          'Tell the supplier what the part must survive: heat, sunlight, impact, moisture, or repeated movement. The cheapest material is not always the lowest-cost choice over the life of the part.',
        ],
      },
      {
        heading: 'Compare the details behind the price',
        paragraphs: [
          'A useful quote includes more than a rupee amount. Compare material, production time, finishing, delivery date, shipping or pickup, and minimum order quantity before choosing.',
          '3oD is built around this clearer comparison: one design brief, real responses from independent production partners, and enough detail to make a practical decision.',
        ],
      },
    ],
  },
  {
    slug: '3d-printing-vs-cnc-machining-which-process-do-you-need',
    title: '3D Printing vs CNC Machining: Which Process Do You Need?',
    description:
      'Understand the practical difference between 3D printing and CNC machining for prototypes, functional parts, finishes, and small batches.',
    datePublished: '2026-09-30',
    readTime: '7 min read',
    category: 'Manufacturing basics',
    image: 'https://images.unsplash.com/photo-1565439373077-7c7f4d7a2b86?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Industrial CNC machining equipment in a workshop',
    intro:
      'The right production process depends on what your part needs to do, not just how it looks. The fastest way to choose is to compare material, geometry, tolerance, quantity, and finish together.',
    sections: [
      {
        heading: 'When 3D printing is a strong fit',
        paragraphs: [
          '3D printing is usually a good starting point for prototypes, custom enclosures, jigs, fixtures, cosplay pieces, and low-volume parts with complex geometry. It reduces tooling requirements and makes design changes relatively quick.',
          'It is especially useful when you want one or a few parts before committing to a larger production run.',
        ],
      },
      {
        heading: 'When CNC machining is worth considering',
        paragraphs: [
          'CNC milling and turning can be the better choice when you need a metal part, tighter tolerances, a specific surface finish, or strong and repeatable production in a subtractive material.',
          'Machining can involve setup and tooling costs, so it is important to share critical dimensions and expected quantity early in the quoting process.',
        ],
      },
      {
        heading: 'A simple decision checklist',
        paragraphs: [
          'Ask five questions: Does the part need to be metal? How tight are the tolerances? How many parts do you need? What loads and temperatures will it see? Which surfaces or features are cosmetic or critical?',
          '3oD currently starts with 3D printing and is building toward a broader digital manufacturing network, so the same quote-first workflow can grow with your production needs.',
        ],
      },
    ],
  },
  {
    slug: 'how-to-prepare-a-cad-file-for-a-manufacturing-quote',
    title: 'How to Prepare a CAD File for a Manufacturing Quote',
    description:
      'Use this checklist to give a 3D printing or future CNC manufacturing partner the information needed for a faster, clearer quote.',
    datePublished: '2026-09-30',
    readTime: '5 min read',
    category: 'Design checklist',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Engineer reviewing a technical manufacturing drawing',
    intro:
      'A production partner can only quote what they can understand. A tidy file and a short, specific brief reduce back-and-forth and help you get a response that is useful rather than vague.',
    sections: [
      {
        heading: 'Include the essentials',
        paragraphs: [
          'Share the native CAD file when appropriate, plus a neutral export such as STL, STEP, or 3MF. State the quantity, units, target material, finish, and deadline in the request itself.',
          'If the part is one component in an assembly, include a screenshot or simple description of what it connects to and which dimensions matter most.',
        ],
      },
      {
        heading: 'Call out constraints',
        paragraphs: [
          'Mark holes, threads, mating faces, snap fits, moving clearances, and other critical features. If you have a tolerance requirement, write it down instead of expecting the supplier to infer it from the model.',
          'For visual parts, describe the expected finish and acceptable layer lines. For functional parts, describe the loads and environment that matter.',
        ],
      },
      {
        heading: 'Make the quote easy to compare',
        paragraphs: [
          'Ask each partner to return price, lead time, process, material, finishing assumptions, and delivery terms. Consistent information makes the decision easier and protects both sides from surprises.',
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
