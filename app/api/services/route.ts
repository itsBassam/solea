import { listServices } from '@/lib/crm-db';

export async function GET() {
  try { return Response.json({ services: await listServices() }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Services unavailable.' }, { status: 500 }); }
}
