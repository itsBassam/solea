'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="quiet-error">
      <p className="eyebrow">WE HIT A LITTLE PAUSE</p>
      <h1>Please try again in a moment.</h1>
      <p>Your place is still here.</p>
      <button className="button" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
