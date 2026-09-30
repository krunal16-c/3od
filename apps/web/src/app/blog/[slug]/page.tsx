import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '../../../components/marketing/footer';
import { Header } from '../../../components/marketing/hero';
import { blogPosts, getBlogPost } from '../../content/blog';

export function generateStaticParams() {
  return blogPosts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.description, images: [post.image] },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: [post.image],
    datePublished: post.datePublished,
    dateModified: post.datePublished,
    author: { '@type': 'Organization', name: '3oD by Zester Product Studio' },
    publisher: { '@type': 'Organization', name: '3oD by Zester Product Studio' },
    mainEntityOfPage: `https://3od.zesterproductstudio.com/blog/${post.slug}`,
  };

  return (
    <>
      <Header />
      <main className="article-page shell">
        <Link className="article-back" href="/blog">← All guides</Link>
        <p className="eyebrow">{post.category} · {post.readTime}</p>
        <h1>{post.title}</h1>
        <p className="lead">{post.intro}</p>
        <div className="article-image" style={{ backgroundImage: `url(${post.image})` }} role="img" aria-label={post.imageAlt} />
        <article className="article-body">
          {post.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </article>
        <div className="article-cta">
          <p className="eyebrow">Ready to make it?</p>
          <h2>Upload your design and get a real quote.</h2>
          <Link className="button" href="/request-quote">Start a quote →</Link>
        </div>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <Footer />
    </>
  );
}
