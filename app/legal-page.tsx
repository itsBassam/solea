import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from './brand-chrome';

export default function LegalPreview({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main className="legal-page" id="top">
      <SiteHeader />
      <section>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="legal-note">
          <span>OWNER COMPLETION REQUIRED</span>
          <p>
            This preview intentionally contains no invented legal commitments.
            The final document should be reviewed and approved by the SOLÉA.Co
            owner before the production domain is connected.
          </p>
        </div>
        <Link className="text-link" href="/">
          Return to SOLÉA.Co <ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
