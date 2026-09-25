import type { Metadata } from 'next';
import { Button } from '../../components/ui/button';
import { Header } from '../../components/marketing/hero';
import { siteCopy } from '../content/site-copy';

export const metadata: Metadata = {
  title: siteCopy.seo.buyersTitle,
  description: siteCopy.seo.buyersDescription,
  alternates: { canonical: '/for-buyers' },
};
export default function BuyersPage() {
  return (
    <>
      <Header />
      <main className="simple-page shell">
        <p className="eyebrow">{siteCopy.buyersPage.eyebrow}</p>
        <h1>{siteCopy.buyersPage.title}</h1>
        <p className="lead">{siteCopy.buyersPage.lead}</p>
        <div className="simple-points">
          {siteCopy.buyersPage.points.map(([title, body]) => (
            <div key={title}>
              <b>{title}</b>
              <span>{body}</span>
            </div>
          ))}
        </div>
        <Button href="/request-quote">{siteCopy.buyer.cta}</Button>
      </main>
    </>
  );
}
