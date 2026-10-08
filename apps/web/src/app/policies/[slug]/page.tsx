import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '../../../components/marketing/footer';
import { Header } from '../../../components/marketing/hero';
import { getPolicyPage, policyPages } from '../../content/policies';

export function generateStaticParams() {
  return policyPages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const policy = getPolicyPage((await params).slug);
  if (!policy) return {};
  return { title: policy.title, description: policy.description, alternates: { canonical: `/policies/${policy.slug}` } };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const policy = getPolicyPage((await params).slug);
  if (!policy) notFound();

  return (
    <>
      <Header />
      <main className="simple-page shell policy-page">
        <p className="eyebrow">{policy.eyebrow}</p>
        <h1>{policy.title}</h1>
        <p className="lead">{policy.intro}</p>
        <div className="policy-content">
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
            </section>
          ))}
        </div>
        <Link className="article-back" href="/">← Return home</Link>
      </main>
      <Footer />
    </>
  );
}
