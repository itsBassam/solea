'use client';

import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function BrandLogo({ href = '/' }: { href?: string }) {
  return (
    <Link className="logo" href={href} aria-label="SOLÉA.Co home">
      <img src="/media/solea-logo-dark.png" alt="SOLÉA.Co" />
    </Link>
  );
}

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) =>
      event.key === 'Escape' && setOpen(false);
    document.body.dataset.menuOpen = 'true';
    addEventListener('keydown', close);
    return () => {
      delete document.body.dataset.menuOpen;
      removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <header className={`site-header ${overlay ? 'site-header-overlay' : ''}`}>
      <BrandLogo href="/#top" />
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/about">About</Link>
        <Link href="/#services">Services</Link>
        <Link href="/#details">The details</Link>
      </nav>
      <Link className="button small header-book" href="/booking">
        Book a moment <ArrowUpRight aria-hidden="true" size={17} />
      </Link>
      <button
        className="menu-toggle"
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      <div
        id="mobile-menu"
        className={`mobile-menu ${open ? 'open' : ''}`}
        aria-hidden={!open}
      >
        <p className="eyebrow">SOLÉA.Co</p>
        <nav aria-label="Mobile navigation">
          <Link href="/" onClick={() => setOpen(false)}>
            Home
          </Link>
          <Link href="/about" onClick={() => setOpen(false)}>
            About
          </Link>
          <Link href="/#services" onClick={() => setOpen(false)}>
            Services
          </Link>
          <Link href="/booking" onClick={() => setOpen(false)}>
            Book your moment
          </Link>
        </nav>
        <p>A little polish. A little pause. A whole lot of you.</p>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-lead">
        <BrandLogo href="/#top" />
        <p>A little time for yourself.</p>
      </div>
      <div className="footer-links">
        <div>
          <span>Explore</span>
          <Link href="/about">About SOLÉA.Co</Link>
          <Link href="/#services">Signature services</Link>
          <Link href="/booking">Book an appointment</Link>
        </div>
        <div>
          <span>Studio</span>
          <Link href="/studio">Owner workspace</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
      <div className="footer-ending">
        <p>Beauty, down to the details.</p>
        <span>
          Preview edition. Final studio details will be completed before launch.
        </span>
        <Link href="/#top">Back to top</Link>
      </div>
    </footer>
  );
}
