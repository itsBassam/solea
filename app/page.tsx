import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { listServices } from '@/lib/crm-db';
import { SiteFooter, SiteHeader } from './brand-chrome';
import ScrollFilm from './scroll-film';

export const dynamic = 'force-dynamic';

const servicePresentation: Record<string, { style: string; image: string }> = {
  svc_manicure: { style: 'manicure', image: 'manicure-natural.jpg' },
  svc_gel: { style: 'gel', image: 'ombre-nails.jpg' },
  svc_shape: { style: 'shape', image: 'manicure-detail.jpg' },
  svc_artistry: { style: 'art', image: 'manicure-pink.jpg' },
};

export default async function Home() {
  const services = await listServices();
  return (
    <main id="top">
      <a className="skip-link" href="#about">
        Skip to content
      </a>
      <SiteHeader overlay />
      <ScrollFilm />
      <section className="about section-pad" id="about">
        <div className="about-copy">
          <p className="eyebrow">THE SOLÉA.Co PHILOSOPHY</p>
          <h2>
            Beauty in
            <br />
            the <em>smallest</em>
            <br />
            details.
          </h2>
          <p>
            A little time for yourself. A colour that feels like you. Nails that
            make the everyday feel a little more extraordinary.
          </p>
          <Link className="text-link" href="/about">
            Read our story <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <figure className="about-image">
          <img
            src="/media/nail-salon-reference.jpg"
            alt="Interior inspiration: blush manicure chairs and a softly lit nail colour display at Diamond Nails"
            loading="lazy"
          />
          <figcaption>
            <span>ATMOSPHERE INSPIRATION</span>
            <a
              href="https://www.totalfitouts.com.au/wp-content/uploads/2024/03/Diamond-Nails-Sunny-Coast-South6.jpg"
              target="_blank"
              rel="noreferrer"
            >
              Diamond Nails / Total Fitouts
              <ArrowUpRight aria-hidden="true" size={15} />
            </a>
          </figcaption>
        </figure>
        <span className="vertical-note">A LITTLE RITUAL. ALL YOURS.</span>
      </section>
      <section className="services section-pad" id="services">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MADE FOR YOUR MOMENT</p>
            <h2>
              Our signature <em>services.</em>
            </h2>
          </div>
          <Link className="text-link" href="/booking">
            Make it yours <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="service-grid">
          {services.map((service, index) => {
            const presentation = servicePresentation[service.id] || {
              style: index % 2 ? 'gel' : 'manicure',
              image: index % 2 ? 'ombre-nails.jpg' : 'manicure-natural.jpg',
            };
            return (
              <Link
                className={`service-card ${presentation.style}`}
                href={`/booking?service=${encodeURIComponent(service.id)}`}
                key={service.id}
              >
                <div className="service-image">
                  <img
                    src={`/media/${presentation.image}`}
                    alt=""
                    loading="lazy"
                  />
                  <span className="service-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="service-arrow" aria-hidden="true">
                    <ArrowUpRight size={16} />
                  </span>
                </div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="service-facts">
                  <span>{service.durationMinutes} min</span>
                  <span>
                    {service.priceSar === null
                      ? 'Price by studio'
                      : `SAR ${new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(service.priceSar)}`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="details section-pad" id="details">
        <p className="eyebrow">A SIGNATURE, NOT A STATEMENT</p>
        <h2>
          Soft shades.
          <br />
          <em>Strong impression.</em>
        </h2>
        <p>
          From a barely-there blush to a deeper shade of you.
          <br />
          Find beauty in the finishing touch.
        </p>
      </section>
      <section
        className="atelier-journal section-pad"
        aria-labelledby="journal-title"
      >
        <div className="journal-copy">
          <p className="eyebrow">THE RITUAL, CONSIDERED</p>
          <h2 id="journal-title">
            A pause with <em>purpose.</em>
          </h2>
          <p>
            Care is not one grand gesture. It lives in the preparation, the
            colour chosen slowly, and the final detail that feels entirely your
            own.
          </p>
          <Link className="text-link" href="/about">
            Inside SOLÉA.Co <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <div className="journal-gallery">
          <figure className="journal-feature">
            <img
              src="/media/manicure-natural.jpg"
              alt="A precise natural manicure being shaped"
              loading="lazy"
            />
            <figcaption>01 / THE PREPARATION</figcaption>
          </figure>
          <figure>
            <img
              src="/media/manicure-pink.jpg"
              alt="Glossy pink polish being applied"
              loading="lazy"
            />
            <figcaption>02 / THE COLOUR</figcaption>
          </figure>
          <figure>
            <img
              src="/media/ombre-nails.jpg"
              alt="Burgundy ombré almond nails"
              loading="lazy"
            />
            <figcaption>03 / THE FINISH</figcaption>
          </figure>
        </div>
      </section>
      <section
        className="principles section-pad"
        aria-labelledby="principles-title"
      >
        <div>
          <p className="eyebrow">WHY SOLÉA.Co</p>
          <h2 id="principles-title">
            Quiet luxury, <em>felt.</em>
          </h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <h3>Personal, always.</h3>
            <p>
              A moment shaped around your taste, your pace and the details you
              return to.
            </p>
          </li>
          <li>
            <span>02</span>
            <h3>Craft in focus.</h3>
            <p>
              Preparation, proportion and finish receive the same considered
              attention.
            </p>
          </li>
          <li>
            <span>03</span>
            <h3>Time that is yours.</h3>
            <p>
              A calm space in the day, made to feel unhurried from booking to
              final touch.
            </p>
          </li>
        </ol>
      </section>
      <section className="appointment section-pad" id="appointment">
        <div>
          <p className="eyebrow">YOUR NEXT LITTLE LUXURY</p>
          <h2>
            Take a moment.
            <br />
            <em>Make it yours.</em>
          </h2>
          <p>Beautiful nails begin with a little time for you.</p>
          <Link className="button" href="/booking">
            Book an appointment <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="appointment-image">
          <img
            src="/media/ombre-nails.jpg"
            alt="Burgundy ombré manicure detail"
            loading="lazy"
          />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
