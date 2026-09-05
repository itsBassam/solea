import Link from 'next/link';
import ScrollFilm from './scroll-film';
const services = [
  [
    '01',
    'The manicure',
    'A beautifully considered foundation.',
    'manicure',
    'manicure-natural.jpg',
  ],
  [
    '02',
    'Gel & gloss',
    'Colour with a little more staying power.',
    'gel',
    'ombre-nails.jpg',
  ],
  [
    '03',
    'Shape & length',
    'Your silhouette, refined.',
    'shape',
    'manicure-detail.jpg',
  ],
  [
    '04',
    'Nail artistry',
    'The smallest canvas. Your expression.',
    'art',
    'manicure-pink.jpg',
  ],
];
function Logo() {
  return (
    <a className="logo" href="#top" aria-label="SOLÉA.Co home">
      <img src="/media/solea-logo-dark.png" alt="SOLÉA.Co" />
    </a>
  );
}
export default function Home() {
  return (
    <main id="top">
      <a className="skip-link" href="#about">
        Skip to content
      </a>
      <header className="header">
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#about">The atelier</a>
          <a href="#services">Our services</a>
          <a href="#details">The details</a>
        </nav>
        <Link className="button small" href="/booking">
          Book a moment <span>↗</span>
        </Link>
      </header>
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
          <a className="text-link" href="#services">
            Find your signature <span>↗</span>
          </a>
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
              Diamond Nails / Total Fitouts ↗
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
            Make it yours <span>↗</span>
          </Link>
        </div>
        <div className="service-grid">
          {services.map(([number, title, description, style, image]) => (
            <Link
              className={`service-card ${style}`}
              href="/booking"
              key={number}
            >
              <div className="service-image">
                <img src={`/media/${image}`} alt="" loading="lazy" />
                <span className="service-number">{number}</span>
                <span className="service-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </Link>
          ))}
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
        <span className="detail-flower" aria-hidden="true">
          ✳
        </span>
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
            Book an appointment <span>↗</span>
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
      <footer>
        <Logo />
        <p>Beauty, down to the details.</p>
        <a className="text-link" href="#top">
          Back to top ↑
        </a>
      </footer>
    </main>
  );
}
