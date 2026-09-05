import type { Metadata } from 'next';
import LegalPreview from '../legal-page';

export const metadata: Metadata = {
  title: 'Privacy',
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <LegalPreview
      eyebrow="PRIVACY"
      title="Privacy, with care."
      description="The final privacy notice will explain how SOLÉA.Co handles booking and client information."
    />
  );
}
