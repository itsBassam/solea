import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SOLÉA.Co — Beauty, down to the details', description: 'A little polish. A little pause. Discover the SOLÉA.Co nail atelier and find your signature finish.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
