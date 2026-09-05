import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="quiet-error">
      <p className="eyebrow">A LITTLE DETOUR</p>
      <h1>This moment is not here.</h1>
      <p>The page may have moved, but SOLÉA.Co is close by.</p>
      <Link className="button" href="/">
        Return home
      </Link>
    </main>
  );
}
