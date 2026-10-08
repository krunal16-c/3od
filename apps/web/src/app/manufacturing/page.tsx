import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '../../components/marketing/footer';
import { Header } from '../../components/marketing/hero';
import { manufacturingDirectory } from '../content/manufacturing';

export const metadata: Metadata = {
  title: 'Manufacturing Processes in India',
  description:
    'Explore the manufacturing processes on 3oD. 3D printing is available now; CNC machining and other capabilities are being added as the network grows.',
  alternates: { canonical: '/manufacturing' },
};

export default function ManufacturingDirectoryPage() {
  return (
    <>
      <Header />
      <main className="simple-page shell process-directory-page">
        <p className="eyebrow">The 3oD process directory</p>
        <h1>Choose the process your part actually needs.</h1>
        <p className="lead">
          Start with the capabilities available through the network today. Future processes are shown transparently so you know what is live and what is still being built.
        </p>
        <div className="process-directory-grid">
          {manufacturingDirectory.map((process) => (
            <article className="process-directory-card" key={process.name}>
              <p className="eyebrow">{process.status}</p>
              <h2>{process.name}</h2>
              {process.live && process.slug ? (
                <Link className="text-link" href={`/manufacturing/${process.slug}`}>Explore this process →</Link>
              ) : (
                <p className="process-coming-copy">Not available for live quotes yet. We’ll add it when verified partners and workflows are ready.</p>
              )}
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
