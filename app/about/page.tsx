import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../brand-chrome';

export const metadata: Metadata = {
  title: 'About SOLÉA.Co',
  description:
    'The care, craft and quiet details behind every SOLÉA.Co moment.',
};

export default function AboutPage() {
  return (
    <main className="about-page" id="top">
      <SiteHeader />
      <section className="about-hero">
        <div>
          <p className="eyebrow">THE STORY</p>
          <h1>
            Beauty begins in the <em>details.</em>
          </h1>
          <p>
            SOLÉA.Co is a reminder that care can be quiet, personal and
            beautifully considered.
          </p>
        </div>
        <figure>
          <img src="/media/ombre-nails.jpg" alt="Burgundy ombré almond nails" />
          <figcaption>THE SOLÉA.Co COLOUR STUDY</figcaption>
        </figure>
      </section>
      <section className="story-chapters section-pad">
        <article>
          <span>01</span>
          <div>
            <p className="eyebrow">THE PHILOSOPHY</p>
            <h2>
              A little time, <em>made yours.</em>
            </h2>
          </div>
          <p>
            The experience is designed around a simple belief: the smallest
            rituals can change the way an ordinary day feels.
          </p>
        </article>
        <article>
          <span>02</span>
          <div>
            <p className="eyebrow">THE CRAFT</p>
            <h2>
              Nothing rushed. <em>Nothing overlooked.</em>
            </h2>
          </div>
          <p>
            Shape, colour and finish are treated as one composition. Each
            decision is deliberate, yet the result should feel effortless.
          </p>
        </article>
        <article>
          <span>03</span>
          <div>
            <p className="eyebrow">THE EXPERIENCE</p>
            <h2>
              Softly personal, <em>always.</em>
            </h2>
          </div>
          <p>
            Your preferences and past moments are remembered so every return can
            feel familiar, thoughtful and entirely your own.
          </p>
        </article>
      </section>
      <section className="about-spread section-pad">
        <figure className="spread-tall">
          <img
            src="/media/manicure-natural.jpg"
            alt="A natural manicure being precisely shaped"
            loading="lazy"
          />
          <figcaption>THE PREPARATION</figcaption>
        </figure>
        <div>
          <p className="eyebrow">THE DETAILS</p>
          <h2>
            The finishing touch is never just the <em>finish.</em>
          </h2>
          <p>
            It is the colour that catches your eye, the silhouette that feels
            right, and the quiet confidence you carry afterwards.
          </p>
        </div>
        <figure className="spread-wide">
          <img
            src="/media/manicure-pink.jpg"
            alt="Pink polish being applied with care"
            loading="lazy"
          />
          <figcaption>THE COLOUR</figcaption>
        </figure>
      </section>
      <section className="inspiration-note section-pad">
        <div>
          <p className="eyebrow">ATELIER ATMOSPHERE</p>
          <h2>
            A setting for <em>slowing down.</em>
          </h2>
          <p>
            This visual reference guides the warmth, light and calm envisioned
            for the SOLÉA.Co experience. It is inspiration, not a photograph of
            the studio.
          </p>
          <a
            className="text-link"
            href="https://www.totalfitouts.com.au/wp-content/uploads/2024/03/Diamond-Nails-Sunny-Coast-South6.jpg"
            target="_blank"
            rel="noreferrer"
          >
            View image source <ArrowUpRight aria-hidden="true" size={18} />
          </a>
        </div>
        <figure>
          <img
            src="/media/nail-salon-reference.jpg"
            alt="Atmosphere inspiration showing a softly lit pink nail salon"
            loading="lazy"
          />
          <figcaption>
            DIAMOND NAILS / TOTAL FITOUTS, VISUAL REFERENCE
          </figcaption>
        </figure>
      </section>
      <section className="about-invitation section-pad">
        <p className="eyebrow">THE INVITATION</p>
        <h2>
          Your next little luxury is <em>waiting.</em>
        </h2>
        <Link className="button" href="/booking">
          Book your moment <ArrowUpRight aria-hidden="true" size={18} />
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
