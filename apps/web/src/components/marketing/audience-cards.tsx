import { siteCopy } from '../../app/content/site-copy';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export function AudienceCards() {
  return (
    <section className="section shell audience-section">
      <div className="section-heading">
        <p className="eyebrow">{siteCopy.sections.audienceEyebrow}</p>
        <h2>{siteCopy.sections.audienceTitle}</h2>
      </div>
      <div className="audience-grid">
        <Card className="buyer-card" ariaLabel={siteCopy.nav.buyers}>
          <p className="card-kicker">{siteCopy.nav.buyers}</p>
          <h3>{siteCopy.buyer.title}</h3>
          <p>{siteCopy.buyer.body}</p>
          <Button href="/for-buyers">Explore for buyers</Button>
        </Card>
        <Card className="supplier-card" ariaLabel={siteCopy.nav.suppliers}>
          <p className="card-kicker">{siteCopy.nav.suppliers}</p>
          <h3>{siteCopy.supplier.title}</h3>
          <p>{siteCopy.supplier.body}</p>
          <Button href="/for-printer-owners" secondary>
            {siteCopy.supplier.cta}
          </Button>
        </Card>
      </div>
    </section>
  );
}
