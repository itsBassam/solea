import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SOLÉA.Co — Beauty, down to the details',
    template: '%s | SOLÉA.Co',
  },
  description:
    'A little polish. A little pause. Discover the SOLÉA.Co nail atelier and find your signature finish.',
};
export const viewport: Viewport = {
  themeColor: '#111211',
  colorScheme: 'dark light',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
