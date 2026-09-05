import { listAvailableTimes } from '@/lib/crm-db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  try { return Response.json({ times: await listAvailableTimes(url.searchParams.get('serviceId') || '', url.searchParams.get('date') || '') }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Availability unavailable.' }, { status: 500 }); }
}
