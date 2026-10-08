export type PolicySection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type PolicyPage = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  sections: PolicySection[];
};

export const policyPages: PolicyPage[] = [
  {
    slug: 'privacy',
    eyebrow: 'Privacy policy',
    title: 'How 3oD handles your information.',
    description: 'Understand what information 3oD collects, why we use it, and how we protect it.',
    intro: 'This policy explains how 3oD by Zester Product Studio handles information when you use our website and marketplace.',
    sections: [
      { heading: 'Information we collect', paragraphs: ['We collect account details such as your name, email address, role, and information you choose to add to a request, vendor profile, or message. We also receive the design files and project details you upload so manufacturing partners can review your request.'] },
      { heading: 'How we use information', paragraphs: ['We use this information to operate the marketplace, authenticate accounts, route quote requests, help buyers and manufacturing partners communicate, prevent abuse, and improve the service. We do not sell your design files or personal information.'] },
      { heading: 'Files and retention', paragraphs: ['Design files are stored in protected application storage and are made available only for the request workflow and related support. We retain information for as long as needed to provide the service, resolve disputes, meet legal obligations, or enforce our policies.'] },
      { heading: 'Your choices', paragraphs: ['You can contact us to ask about access, correction, or deletion of your account information. Some records may need to be retained where required for security, fraud prevention, legal compliance, or an unresolved transaction.'] },
      { heading: 'Contact', paragraphs: ['For privacy questions, contact partnerships@zesterproductstudio.com.'] },
    ],
  },
  {
    slug: 'terms',
    eyebrow: 'Terms of use',
    title: 'The rules for using 3oD.',
    description: 'Read the terms that apply when buyers and manufacturing partners use the 3oD marketplace.',
    intro: 'By using 3oD, you agree to use the marketplace honestly, lawfully, and in a way that respects other people’s work and safety.',
    sections: [
      { heading: '3oD is a marketplace', paragraphs: ['3oD helps buyers find independent manufacturing partners and exchange project information and quotes. A quote, message, or vendor profile does not by itself create an order or guarantee a manufacturing result. The buyer and partner remain responsible for confirming specifications, price, timing, shipping, and acceptance before work begins.'] },
      { heading: 'Accounts', paragraphs: ['Keep your login details secure and provide accurate information. You are responsible for activity on your account and must promptly tell us if you believe it has been compromised.'] },
      { heading: 'Fair use', paragraphs: ['Do not use 3oD for unlawful, dangerous, fraudulent, infringing, or abusive activity. We may restrict or remove content and suspend access when necessary to protect users, the service, or the law.'] },
      { heading: 'Independent partners', paragraphs: ['Manufacturing partners set their own capabilities, pricing, lead times, and acceptance decisions. 3oD does not currently verify every partner, machine, material, measurement, or representation. Buyers should review quotes and communicate requirements carefully.'] },
      { heading: 'Changes and contact', paragraphs: ['We may update these terms as the marketplace develops. Material changes will be reflected on this page. Questions can be sent to partnerships@zesterproductstudio.com.'] },
    ],
  },
  {
    slug: 'cancellation-and-refunds',
    eyebrow: 'Cancellations and refunds',
    title: 'What happens when a project changes.',
    description: 'Understand cancellation, refund, and project-change expectations on 3oD.',
    intro: '3oD currently facilitates requests, conversations, and quotes. The cancellation and refund terms for a paid job must be confirmed between the buyer and manufacturing partner before production starts.',
    sections: [
      { heading: 'Before a quote is accepted', paragraphs: ['A buyer can withdraw or update an open request. A partner can decline to quote. If no order or payment has been agreed, there is normally no production obligation.'] },
      { heading: 'After work is agreed', paragraphs: ['Before production begins, the buyer and partner should confirm whether setup, material, or other committed costs are refundable. Once a custom part has entered production, cancellation may not be possible without covering costs already incurred.'] },
      { heading: 'Problems with a project', paragraphs: ['If a part is materially different from the accepted specification, arrives damaged, or misses an agreed requirement, contact the partner first and keep the request, quote, messages, and photos. 3oD may help document the issue and review reports, but does not replace the parties’ agreed commercial terms.'] },
      { heading: 'Contact 3oD', paragraphs: ['For help with a marketplace issue, contact partnerships@zesterproductstudio.com with your request or quote reference.'] },
    ],
  },
  {
    slug: 'file-ownership',
    eyebrow: 'File ownership',
    title: 'Your design stays yours.',
    description: 'Learn how 3oD treats uploaded CAD, STL, and other design files.',
    intro: 'You keep ownership of the design files and project materials you upload to 3oD. Upload only files you have the right to use and share for the requested manufacturing work.',
    sections: [
      { heading: 'Permission to process', paragraphs: ['You give 3oD a limited permission to store, scan, transmit, and display your files only as needed to operate the request, quote, support, security, and dispute workflows. This permission ends when it is no longer needed, subject to legitimate retention requirements.'] },
      { heading: 'Sharing with partners', paragraphs: ['When you submit a request, relevant project details and files may be shared with manufacturing partners who are able to review or quote the work. Do not upload confidential or regulated material unless you are comfortable with that workflow and have the necessary permissions.'] },
      { heading: 'Partner responsibilities', paragraphs: ['Partners may use a file only to evaluate, quote, and complete the agreed work. They must not copy, resell, publish, or use a buyer’s design for another purpose without permission. Report suspected misuse to partnerships@zesterproductstudio.com.'] },
      { heading: 'Safety and intellectual property', paragraphs: ['3oD does not decide whether a design is safe, patentable, copyrighted, or suitable for a particular use. Buyers and partners must respect intellectual-property rights and applicable product-safety rules.'] },
    ],
  },
  {
    slug: 'acceptable-use',
    eyebrow: 'Acceptable use',
    title: 'Build useful things responsibly.',
    description: 'See what is and is not allowed on the 3oD digital manufacturing marketplace.',
    intro: '3oD is for legitimate prototyping, repair, education, product development, and manufacturing work. The following uses are not allowed.',
    sections: [
      { heading: 'Not allowed', paragraphs: [], bullets: ['Weapons, weapon components, or items intended to cause harm.', 'Fraud, impersonation, stolen designs, counterfeit goods, or infringement of another person’s rights.', 'Requests involving illegal drugs, controlled items, or unlawful surveillance or access.', 'Harassment, threats, discriminatory content, spam, malware, or attempts to compromise the service.', 'Files or instructions that create an unreasonable risk to people, property, or the environment.'] },
      { heading: 'Reporting a concern', paragraphs: ['If a request, listing, message, or partner appears unsafe, fraudulent, or abusive, do not proceed. Save the reference and contact partnerships@zesterproductstudio.com so our team can review it.'] },
      { heading: 'Enforcement', paragraphs: ['We may pause a request, remove content, restrict an account, or cooperate with lawful investigations when we believe these rules have been breached.'] },
    ],
  },
];

export function getPolicyPage(slug: string) {
  return policyPages.find((policy) => policy.slug === slug);
}
