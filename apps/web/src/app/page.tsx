import { siteCopy } from './content/site-copy';
import { AudienceCards } from '../components/marketing/audience-cards';
import { Footer } from '../components/marketing/footer';
import { Header, Hero } from '../components/marketing/hero';
import { HowItWorks } from '../components/marketing/how-it-works';
import { Button } from '../components/ui/button';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <AudienceCards />
        <section className="section shell service-section">
          <div className="section-heading">
            <p className="eyebrow">One network, more ways to make</p>
            <h2>Choose the process your part needs.</h2>
          </div>
          <div className="service-grid">
            {siteCopy.serviceCategories.map(([name, description, status]) => (
              <article className="service-card" key={name}>
                <span className="service-status">{status}</span>
                <h3>{name}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="promise-section shell">
          <p className="eyebrow">{siteCopy.sections.promiseEyebrow}</p>
          <h2>{siteCopy.buyer.promise}</h2>
        </section>
        <HowItWorks />
        <section className="section shell use-section">
          <div className="section-heading">
            <p className="eyebrow">{siteCopy.sections.useEyebrow}</p>
            <h2>{siteCopy.sections.useTitle}</h2>
          </div>
          <div className="use-list">
            {siteCopy.uses.map((use) => (
              <span key={use}>{use}</span>
            ))}
          </div>
        </section>
        <section className="trust-section shell">
          <div>
            <p className="eyebrow">A better handoff</p>
            <h2>{siteCopy.trust.title}</h2>
          </div>
          <p>{siteCopy.trust.body}</p>
        </section>
        <section className="final-cta shell">
          <p className="eyebrow">{siteCopy.sections.finalEyebrow}</p>
          <h2>
            {siteCopy.sections.finalTitle}
            <br />
            <em>{siteCopy.sections.finalAccent}</em>
          </h2>
          <Button href="/request-quote">{siteCopy.buyer.cta}</Button>
        </section>
      </main>
      <Footer />
    </>
  );
}
