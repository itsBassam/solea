import { getStudioData, isStudioAuthorized, studioMutation } from '@/lib/crm-db';

export const dynamic = 'force-dynamic';

async function authorize() {
  const access = await isStudioAuthorized();
  return access.authorized;
}

export async function GET() {
  if (!await authorize()) return Response.json({ error: 'Studio access is private.' }, { status: 403 });
  try { return Response.json(await getStudioData()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Studio unavailable.' }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await authorize()) return Response.json({ error: 'Studio access is private.' }, { status: 403 });
  try { return Response.json(await studioMutation(await request.json())); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to save changes.' }, { status: 400 }); }
}
