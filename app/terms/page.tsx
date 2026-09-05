import type { Metadata } from 'next';
import LegalPreview from '../legal-page';

export const metadata: Metadata = {
  title: 'Terms',
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <LegalPreview
      eyebrow="TERMS"
      title="The thoughtful details."
      description="Booking, cancellation, arrival and payment terms will be added here after owner review."
    />
  );
}
