import { siteCopy } from '../../app/content/site-copy';

export function HowItWorks() {
  return (
    <section className="section shell" id="how-it-works">
      <div className="section-heading">
        <p className="eyebrow">{siteCopy.howItWorks.eyebrow}</p>
        <h2>{siteCopy.howItWorks.title}</h2>
      </div>
      <div className="steps-grid">
        {siteCopy.steps.map(([number, title, body]) => (
          <div className="step" key={number}>
            <span className="step-number">{number}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
