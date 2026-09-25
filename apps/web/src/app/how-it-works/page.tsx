import type { Metadata } from 'next';
import { HowItWorks } from '../../components/marketing/how-it-works';
import { Header } from '../../components/marketing/hero';
import { siteCopy } from '../content/site-copy';

export const metadata: Metadata = {
  title: siteCopy.seo.howTitle,
  description: siteCopy.seo.howDescription,
  alternates: { canonical: '/how-it-works' },
};
export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main>
        <section className="simple-page shell">
          <p className="eyebrow">{siteCopy.howItWorks.pageEyebrow}</p>
          <h1>{siteCopy.howItWorks.pageTitle}</h1>
          <p className="lead">{siteCopy.howItWorks.pageLead}</p>
        </section>
        <HowItWorks />
      </main>
    </>
  );
}
