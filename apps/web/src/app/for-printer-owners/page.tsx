import type { Metadata } from 'next';
import { Button } from '../../components/ui/button';
import { Header } from '../../components/marketing/hero';
import { siteCopy } from '../content/site-copy';

export const metadata: Metadata = {
  title: siteCopy.seo.supplierTitle,
  description: siteCopy.seo.supplierDescription,
  alternates: { canonical: '/for-printer-owners' },
};
export default function SupplierPage() {
  return (
    <>
      <Header />
      <main className="simple-page shell">
        <p className="eyebrow">{siteCopy.supplierPage.eyebrow}</p>
        <h1>{siteCopy.supplierPage.title}</h1>
        <p className="lead">{siteCopy.supplierPage.lead}</p>
        <div className="simple-points">
          {siteCopy.supplierPage.points.map(([title, body]) => (
            <div key={title}>
              <b>{title}</b>
              <span>{body}</span>
            </div>
          ))}
        </div>
        <Button href="/join-as-supplier">{siteCopy.supplier.cta}</Button>
      </main>
    </>
  );
}
