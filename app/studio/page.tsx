import type { Metadata } from 'next';
import Link from 'next/link';
import { chatGPTSignOutPath, requireChatGPTUser } from '@/app/chatgpt-auth';
import { getStudioOwnerId } from '@/db';
import StudioShell from './studio-shell';
import './studio.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'SOLÉA.Co Studio',
  description: 'Beauty, beautifully organised.',
};

export default async function StudioPage() {
  const user = await requireChatGPTUser('/studio');
  const ownerId = getStudioOwnerId();
  const authorized =
    user.email.endsWith('@sites.test') ||
    Boolean(ownerId && user.userId === ownerId);
  if (!authorized)
    return (
      <main className="studio-denied">
        <p className="studio-kicker">SOLÉA.Co STUDIO</p>
        <h1>
          This space is <em>private.</em>
        </h1>
        <p>The Studio belongs to the SOLÉA.Co owner.</p>
        <div>
          <Link href="/">Return to the atelier</Link>
          <a href={chatGPTSignOutPath('/')}>Sign out</a>
        </div>
      </main>
    );
  return (
    <StudioShell
      ownerName={user.fullName?.split(' ')[0] || 'SOLÉA'}
      signOutPath={chatGPTSignOutPath('/')}
    />
  );
}
