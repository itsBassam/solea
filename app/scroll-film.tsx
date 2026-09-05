'use client';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
const LAST_FRAME = 120;
const frameUrl = (frame: number) =>
  `/media/frames/${String(frame + 1).padStart(3, '0')}.webp`;
export default function ScrollFilm() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const root = section.current!,
      surface = canvas.current!;
    const context = surface.getContext('2d');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (!context) return;
    let stopped = false,
      raf = 0,
      active = 0,
      target = 0,
      current = Number(surface.dataset.frame || 0),
      lastTime = 0;
    const cache = new Map<number, ImageBitmap>(),
      pending = new Set<number>(),
      failed = new Set<number>();
    const controller = new AbortController();
    function draw(frame: number) {
      const bitmap = cache.get(frame);
      if (!bitmap || stopped) return;
      context!.drawImage(bitmap, 0, 0, surface.width, surface.height);
      surface.dataset.frame = String(frame);
      setReady(true);
    }
    // ponytail: native canvas, four requests and 18 decoded frames (~36 MB), no animation dependency.
    function load(frame: number) {
      if (
        frame < 0 ||
        frame > LAST_FRAME ||
        cache.has(frame) ||
        pending.has(frame) ||
        failed.has(frame) ||
        active >= 4 ||
        stopped
      )
        return;
      pending.add(frame);
      active++;
      fetch(frameUrl(frame), { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error('Frame unavailable');
          return response.blob();
        })
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          if (stopped) {
            bitmap.close();
            return;
          }
          cache.set(frame, bitmap);
          if (cache.size > 18) {
            const farthest = [...cache.keys()].sort(
              (a, b) => Math.abs(b - current) - Math.abs(a - current),
            )[0];
            cache.get(farthest)?.close();
            cache.delete(farthest);
          }
          if (Math.abs(frame - current) < 1 || !surface.dataset.frame)
            draw(frame);
        })
        .catch(() => {
          if (!stopped) failed.add(frame);
        })
        .finally(() => {
          active--;
          pending.delete(frame);
          if (!stopped) schedule();
        });
    }
    function tick(time: number) {
      raf = 0;
      const dt = Math.min(time - (lastTime || time - 16), 64);
      lastTime = time;
      current += (target - current) * (1 - Math.exp(-dt / 65));
      if (Math.abs(target - current) < 0.08) current = target;
      const frame = Math.round(current);
      draw(frame);
      load(frame);
      if (!preference.matches && !paused) {
        const direction = target >= current ? 1 : -1;
        for (const offset of [1, 2, -1]) load(frame + offset * direction);
      }
      root.style.setProperty('--progress', String(current / LAST_FRAME));
      if (Math.abs(target - current) > 0.08) schedule();
    }
    function schedule() {
      if (!raf && !stopped) raf = requestAnimationFrame(tick);
    }
    function update() {
      const reduced = preference.matches || paused;
      root.dataset.still = String(reduced);
      target = paused
        ? current
        : preference.matches
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                -root.getBoundingClientRect().top /
                  Math.max(1, root.offsetHeight - innerHeight),
              ),
            ) * LAST_FRAME;
      if (preference.matches) current = 0;
      schedule();
    }
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    preference.addEventListener('change', update);
    return () => {
      stopped = true;
      controller.abort();
      cancelAnimationFrame(raf);
      removeEventListener('scroll', update);
      removeEventListener('resize', update);
      preference.removeEventListener('change', update);
      cache.forEach((bitmap) => bitmap.close());
    };
  }, [paused]);
  return (
    <section
      className="film-section"
      ref={section}
      aria-label="SOLÉA.Co manicure in motion"
    >
      <div className="hero">
        <div className="hero-copy">
          <p className="eyebrow">NAIL CARE. SELF CARE. SOLÉA.Co.</p>
          <h1>
            Beautiful
            <br />
            to your
            <br />
            <em>fingertips.</em>
          </h1>
          <p className="hero-description">
            A little polish. A little pause.
            <br />A whole lot of you.
          </p>
          <Link href="/booking" className="button">
            Book an appointment <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <div className="film-frame">
          <img
            className="film-poster"
            src="/media/frames/001.webp"
            alt="An adult woman presenting glossy blush-to-burgundy almond nails"
            fetchPriority="high"
          />
          <canvas
            ref={canvas}
            width={960}
            height={540}
            aria-hidden="true"
            className={ready ? 'ready' : ''}
          />
          <div className="film-caption">
            <span>THE SOLÉA.Co COLOUR STUDY</span>
            <span>01 / BURGUNDY BLUSH</span>
          </div>
        </div>
        <div className="hero-bottom">
          <a href="#about" className="scroll-cue">
            <ArrowDown aria-hidden="true" /> SCROLL TO REVEAL
          </a>
          <span className="hero-edition">
            AN EVERYDAY KIND OF EXTRAORDINARY
          </span>
          <button
            className="motion-control"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
          >
            {paused ? 'Enable motion' : 'Pause motion'}{' '}
            <span aria-hidden="true">
              {paused ? <Play size={12} /> : <Pause size={12} />}
            </span>
          </button>
        </div>
        <div className="film-progress" aria-hidden="true" />
      </div>
    </section>
  );
}
