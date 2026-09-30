import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '../../components/marketing/footer';
import { Header } from '../../components/marketing/hero';

export const metadata: Metadata = {
  title: 'Contact 3oD',
  description: 'Contact 3oD by Zester Product Studio about partnerships, manufacturing networks, and marketplace support.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="simple-page shell contact-page">
        <p className="eyebrow">Contact 3oD</p>
        <h1>Let’s build the making network together.</h1>
        <p className="lead">Whether you want to bring manufacturing capacity to 3oD, explore a partnership, or share feedback, we’d love to hear from you.</p>
        <div className="contact-card">
          <p className="eyebrow">Partnerships and enquiries</p>
          <a className="contact-email" href="mailto:partnerships@zesterproductstudio.com">partnerships@zesterproductstudio.com</a>
          <p>Tell us a little about what you are building, the capabilities you bring, or how we can help. We’ll get back to you as soon as we can.</p>
        </div>
        <Link className="article-back" href="/">← Return home</Link>
      </main>
      <Footer />
    </>
  );
}
