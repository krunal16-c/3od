import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/marketing/hero';
import { Footer } from '../../components/marketing/footer';
import { blogPosts } from '../content/blog';

export const metadata: Metadata = {
  title: 'Manufacturing Guides for Buyers and Partners',
  description:
    'Practical guides to 3D printing, CAD files, CNC machining, materials, quotes, and digital manufacturing in India.',
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  return (
    <>
      <Header />
      <main className="simple-page shell blog-index">
        <p className="eyebrow">3oD journal</p>
        <h1>Useful notes for making real parts.</h1>
        <p className="lead">Straightforward guidance for buyers, builders, and the independent partners who make things happen.</p>
        <div className="blog-grid">
          {blogPosts.map((post) => (
            <article className="blog-card" key={post.slug}>
              <div className="blog-card-image" style={{ backgroundImage: `url(${post.image})` }} role="img" aria-label={post.imageAlt} />
              <div className="blog-card-body">
                <p className="eyebrow">{post.category} · {post.readTime}</p>
                <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
                <p>{post.description}</p>
                <Link className="text-link" href={`/blog/${post.slug}`}>Read the guide →</Link>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
