import { createBooking, manageBooking } from '@/lib/crm-db';

export async function POST(request: Request) {
  try { return Response.json({ appointment: await createBooking(await request.json()) }, { status: 201 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Booking unavailable.' }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try { return Response.json({ appointment: await manageBooking(await request.json()) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to update appointment.' }, { status: 400 }); }
}
