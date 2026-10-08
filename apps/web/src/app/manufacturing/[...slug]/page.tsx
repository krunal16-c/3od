import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '../../../components/marketing/footer';
import { Header } from '../../../components/marketing/hero';
import { getManufacturingLandingPage, manufacturingLandingPages } from '../../content/manufacturing';

const baseUrl = 'https://3od.zesterproductstudio.com';

export function generateStaticParams() {
  return manufacturingLandingPages.map(({ slug }) => ({ slug: slug.split('/') }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const page = getManufacturingLandingPage((await params).slug.join('/'));
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: `/manufacturing/${page.slug}` },
    openGraph: { type: 'website', title: page.metaTitle, description: page.description },
  };
}

export default async function ManufacturingLandingPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const page = getManufacturingLandingPage((await params).slug.join('/'));
  if (!page) notFound();

  const canonical = `${baseUrl}/manufacturing/${page.slug}`;
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: page.title,
        serviceType: page.process,
        description: page.description,
        areaServed: { '@type': 'Country', name: 'India' },
        provider: { '@type': 'Organization', name: '3oD by Zester Product Studio', url: baseUrl },
        url: canonical,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Manufacturing', item: `${baseUrl}/manufacturing` },
          { '@type': 'ListItem', position: 3, name: page.title, item: canonical },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
    ],
  };

  return (
    <>
      <Header />
      <main className="simple-page shell manufacturing-landing-page">
        <Link className="article-back" href="/manufacturing">← All manufacturing processes</Link>
        <p className="eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p className="lead">{page.intro}</p>
        <div className="landing-actions">
          <Link className="button" href={`/request-quote?source=${encodeURIComponent(page.slug)}`} data-analytics-event="lead_cta_clicked">Get a quote for this process ↗</Link>
          <span className="landing-note">Quotes include price, lead time, material, and delivery assumptions.</span>
        </div>
        <div className="landing-grid">
          <section>
            <p className="eyebrow">Common materials</p>
            <ul className="landing-list">{page.materials.map((material) => <li key={material}>{material}</li>)}</ul>
          </section>
          <section>
            <p className="eyebrow">Good for</p>
            <ul className="landing-list">{page.useCases.map((useCase) => <li key={useCase}>{useCase}</li>)}</ul>
          </section>
        </div>
        <section className="landing-faq">
          <p className="eyebrow">Questions, answered</p>
          {page.faqs.map((faq) => (
            <article key={faq.question}>
              <h2>{faq.question}</h2>
              <p>{faq.answer}</p>
            </article>
          ))}
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <Footer />
    </>
  );
}
