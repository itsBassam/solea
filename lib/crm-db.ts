import { getD1, getStudioOwnerId } from '@/db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import type { Appointment, Client, Service, StudioData } from '@/lib/crm-types';

const DEFAULT_SERVICES = [
  [
    'svc_manicure',
    'the-manicure',
    'The Manicure',
    'A beautifully considered foundation.',
    45,
    1,
  ],
  [
    'svc_gel',
    'gel-and-gloss',
    'Gel & Gloss',
    'Colour with a little more staying power.',
    60,
    2,
  ],
  [
    'svc_shape',
    'shape-and-length',
    'Shape & Length',
    'Your silhouette, refined.',
    75,
    3,
  ],
  [
    'svc_artistry',
    'nail-artistry',
    'Nail Artistry',
    'The smallest canvas. Your expression.',
    90,
    4,
  ],
] as const;

const DEFAULT_DAYS = [
  [0, '09:00', '18:00', '13:00', '14:00', 1],
  [1, '09:00', '18:00', '13:00', '14:00', 1],
  [2, '09:00', '18:00', '13:00', '14:00', 1],
  [3, '09:00', '18:00', '13:00', '14:00', 1],
  [4, '09:00', '18:00', '13:00', '14:00', 1],
  [5, '09:00', '18:00', null, null, 0],
  [6, '10:00', '16:00', null, null, 1],
] as const;

export async function ensureStudioSeed() {
  const db = getD1();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        'INSERT OR IGNORE INTO staff (id, name, active, created_at) VALUES (?, ?, 1, ?)',
      )
      .bind('staff_owner', 'SOLÉA.Co', now),
    db
      .prepare(
        'INSERT OR IGNORE INTO studio_settings (key, value, updated_at) VALUES (?, ?, ?)',
      )
      .bind('buffer_minutes', '15', now),
    db
      .prepare(
        'INSERT OR IGNORE INTO studio_settings (key, value, updated_at) VALUES (?, ?, ?)',
      )
      .bind('timezone', 'Asia/Riyadh', now),
  ];
  for (const [
    id,
    slug,
    name,
    description,
    duration,
    order,
  ] of DEFAULT_SERVICES) {
    statements.push(
      db
        .prepare(`INSERT OR IGNORE INTO services
      (id, slug, name, description, duration_minutes, price_sar, availability, status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, 'booking', 'active', ?, ?, ?)`)
        .bind(id, slug, name, description, duration, order, now, now),
    );
  }
  for (const [day, start, end, breakStart, breakEnd, enabled] of DEFAULT_DAYS) {
    statements.push(
      db
        .prepare(`INSERT OR IGNORE INTO availability
      (id, day_of_week, start_time, end_time, break_start, break_end, enabled, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          `availability_${day}`,
          day,
          start,
          end,
          breakStart,
          breakEnd,
          enabled,
          now,
        ),
    );
  }
  await db.batch(statements);
}

export async function listServices(
  includeArchived = false,
): Promise<Service[]> {
  await ensureStudioSeed();
  const where = includeArchived ? '' : "WHERE status = 'active'";
  const result = await getD1()
    .prepare(
      `SELECT id, slug, name, description, duration_minutes, price_sar, availability, status, sort_order FROM services ${where} ORDER BY sort_order, name`,
    )
    .all<Record<string, unknown>>();
  return result.results.map(mapService);
}

export async function listAvailableTimes(
  serviceId: string,
  date: string,
  excludeAppointmentId = '',
): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  await ensureStudioSeed();
  const db = getD1();
  const service = await db
    .prepare(
      "SELECT duration_minutes FROM services WHERE id = ? AND status = 'active'",
    )
    .bind(serviceId)
    .first<{ duration_minutes: number }>();
  if (!service) return [];
  const isOff = await db
    .prepare('SELECT id FROM days_off WHERE date = ?')
    .bind(date)
    .first();
  if (isOff) return [];
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const rule = await db
    .prepare(
      'SELECT start_time, end_time, break_start, break_end, enabled FROM availability WHERE day_of_week = ?',
    )
    .bind(day)
    .first<Record<string, unknown>>();
  if (!rule || Number(rule.enabled) !== 1) return [];
  const buffer = await getBufferMinutes(db);
  const booked = await db
    .prepare(
      "SELECT start_time, end_time FROM appointments WHERE appointment_date = ? AND status != 'cancelled' AND id != ?",
    )
    .bind(date, excludeAppointmentId)
    .all<{ start_time: string; end_time: string }>();
  const start = toMinutes(asText(rule.start_time));
  const end = toMinutes(asText(rule.end_time));
  const breakStart = rule.break_start
    ? toMinutes(asText(rule.break_start))
    : null;
  const breakEnd = rule.break_end ? toMinutes(asText(rule.break_end)) : null;
  const nowLocal = localRiyadhDateTime();
  const times: string[] = [];
  for (
    let cursor = start;
    cursor + service.duration_minutes <= end;
    cursor += 30
  ) {
    const finish = cursor + service.duration_minutes;
    const bufferedFinish = finish + buffer;
    const overlapsBreak =
      breakStart !== null &&
      breakEnd !== null &&
      cursor < breakEnd &&
      bufferedFinish > breakStart;
    const overlapsBooking = booked.results.some(
      (item) =>
        cursor < toMinutes(item.end_time) + buffer &&
        bufferedFinish > toMinutes(item.start_time),
    );
    const time = fromMinutes(cursor);
    const isPast =
      date < nowLocal.date || (date === nowLocal.date && time <= nowLocal.time);
    if (!overlapsBreak && !overlapsBooking && !isPast) times.push(time);
  }
  return times;
}

export type BookingInput = {
  serviceId: string;
  date: string;
  time: string;
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
  preferredContact?: string;
};

export async function createBooking(input: BookingInput) {
  validateBookingInput(input);
  const available = await listAvailableTimes(input.serviceId, input.date);
  if (!available.includes(input.time))
    throw new Error(
      'That time has just become unavailable. Please choose another.',
    );
  const db = getD1();
  const service = await db
    .prepare(
      "SELECT id, name, duration_minutes, price_sar FROM services WHERE id = ? AND status = 'active'",
    )
    .bind(input.serviceId)
    .first<{
      id: string;
      name: string;
      duration_minutes: number;
      price_sar: number | null;
    }>();
  if (!service) throw new Error('Please choose an available service.');
  const now = new Date().toISOString();
  const phone = normalizePhone(input.phone);
  const existing = await db
    .prepare('SELECT id FROM customers WHERE phone = ?')
    .bind(phone)
    .first<{ id: string }>();
  const customerId = existing?.id || crypto.randomUUID();
  const appointmentId = crypto.randomUUID();
  const manageToken = crypto.randomUUID();
  const endTime = fromMinutes(toMinutes(input.time) + service.duration_minutes);
  const slotKey = `${input.date}|${input.time}|staff_owner`;
  const buffer = await getBufferMinutes(db);
  const occupiedSlots = reservationSlotKeys(
    input.date,
    input.time,
    service.duration_minutes,
    buffer,
  );
  try {
    await db.batch([
      db
        .prepare(`INSERT INTO customers (id, full_name, phone, email, preferred_contact, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(phone) DO UPDATE SET full_name = excluded.full_name, email = excluded.email,
        preferred_contact = excluded.preferred_contact, updated_at = excluded.updated_at`)
        .bind(
          customerId,
          clean(input.fullName),
          phone,
          clean(input.email || '') || null,
          input.preferredContact || 'whatsapp',
          now,
          now,
        ),
      db
        .prepare(`INSERT INTO appointments
        (id, customer_id, service_id, staff_id, appointment_date, start_time, end_time, duration_minutes,
        quoted_price_sar, status, customer_notes, slot_key, manage_token, created_at, updated_at)
        VALUES (?, ?, ?, 'staff_owner', ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)`)
        .bind(
          appointmentId,
          customerId,
          service.id,
          input.date,
          input.time,
          endTime,
          service.duration_minutes,
          service.price_sar,
          clean(input.notes || '') || null,
          slotKey,
          manageToken,
          now,
          now,
        ),
      ...occupiedSlots.map((occupiedSlot) =>
        db
          .prepare(
            'INSERT INTO appointment_slots (slot_key, appointment_id, created_at) VALUES (?, ?, ?)',
          )
          .bind(occupiedSlot, appointmentId, now),
      ),
      db
        .prepare(`INSERT INTO messages
        (id, customer_id, appointment_id, kind, channel, body, status, scheduled_for, created_at)
        VALUES (?, ?, ?, 'confirmation', ?, ?, 'ready', ?, ?)`)
        .bind(
          crypto.randomUUID(),
          customerId,
          appointmentId,
          input.preferredContact || 'whatsapp',
          `Your SOLÉA.Co moment is reserved for ${formatHumanDate(input.date)} at ${input.time}.`,
          now,
          now,
        ),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : asText(error);
    if (message.toLowerCase().includes('unique'))
      throw new Error(
        'That time has just become unavailable. Please choose another.',
      );
    throw error;
  }
  return {
    id: appointmentId,
    manageToken,
    service: service.name,
    date: input.date,
    time: input.time,
    endTime,
    durationMinutes: service.duration_minutes,
    priceSar: service.price_sar,
    customerName: clean(input.fullName),
    status: 'confirmed',
  };
}

export async function manageBooking(input: {
  id: string;
  manageToken: string;
  action: 'cancel' | 'reschedule';
  date?: string;
  time?: string;
}) {
  const db = getD1();
  const appointment = await db
    .prepare(
      'SELECT id, service_id, status FROM appointments WHERE id = ? AND manage_token = ?',
    )
    .bind(input.id, input.manageToken)
    .first<{ id: string; service_id: string; status: string }>();
  if (!appointment)
    throw new Error('This appointment link is no longer valid.');
  const now = new Date().toISOString();
  if (input.action === 'cancel') {
    await db.batch([
      db
        .prepare('DELETE FROM appointment_slots WHERE appointment_id = ?')
        .bind(input.id),
      db
        .prepare(
          "UPDATE appointments SET status = 'cancelled', slot_key = NULL, updated_at = ? WHERE id = ?",
        )
        .bind(now, input.id),
    ]);
    return { id: input.id, status: 'cancelled' };
  }
  if (!input.date || !input.time)
    throw new Error('Choose a new date and time.');
  const available = await listAvailableTimes(
    appointment.service_id,
    input.date,
    appointment.id,
  );
  if (!available.includes(input.time))
    throw new Error('That time is not available.');
  const service = await db
    .prepare('SELECT duration_minutes FROM services WHERE id = ?')
    .bind(appointment.service_id)
    .first<{ duration_minutes: number }>();
  if (!service) throw new Error('Service unavailable.');
  const endTime = fromMinutes(toMinutes(input.time) + service.duration_minutes);
  const buffer = await getBufferMinutes(db);
  try {
    await db.batch([
      db
        .prepare('DELETE FROM appointment_slots WHERE appointment_id = ?')
        .bind(input.id),
      db
        .prepare(
          "UPDATE appointments SET appointment_date = ?, start_time = ?, end_time = ?, slot_key = ?, status = 'confirmed', updated_at = ? WHERE id = ?",
        )
        .bind(
          input.date,
          input.time,
          endTime,
          `${input.date}|${input.time}|staff_owner`,
          now,
          input.id,
        ),
      ...reservationSlotKeys(
        input.date,
        input.time,
        service.duration_minutes,
        buffer,
      ).map((occupiedSlot) =>
        db
          .prepare(
            'INSERT INTO appointment_slots (slot_key, appointment_id, created_at) VALUES (?, ?, ?)',
          )
          .bind(occupiedSlot, input.id, now),
      ),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : asText(error);
    if (message.toLowerCase().includes('unique'))
      throw new Error(
        'That time has just become unavailable. Please choose another.',
      );
    throw error;
  }
  return {
    id: input.id,
    status: 'confirmed',
    date: input.date,
    time: input.time,
    endTime,
  };
}

export async function isStudioAuthorized() {
  const user = await getChatGPTUser();
  if (!user) return { user: null, authorized: false };
  const ownerId = getStudioOwnerId();
  const localPreview = user.email.endsWith('@sites.test');
  return {
    user,
    authorized: localPreview || Boolean(ownerId && user.userId === ownerId),
  };
}

export async function getStudioData(): Promise<StudioData> {
  await ensureStudioSeed();
  const db = getD1();
  const [
    appointmentRows,
    serviceRows,
    clientRows,
    messageRows,
    availabilityRows,
    daysOffRows,
    settingRows,
    noteRows,
  ] = await Promise.all([
    db
      .prepare(`SELECT a.*, c.full_name customer_name, c.phone customer_phone, c.email customer_email,
      c.preferred_contact, s.name service_name,
      (SELECT SUM(p.amount_sar) FROM payments p WHERE p.appointment_id = a.id AND p.status = 'paid') recorded_payment_sar,
      (SELECT MAX(p.status) FROM payments p WHERE p.appointment_id = a.id) payment_status
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id JOIN services s ON s.id = a.service_id
      ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT 500`)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        'SELECT id, slug, name, description, duration_minutes, price_sar, availability, status, sort_order FROM services ORDER BY sort_order, name',
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(`SELECT c.*, p.preferred_shape, p.preferred_colors, p.appointment_style,
      COUNT(CASE WHEN a.status = 'completed' THEN 1 END) total_visits,
      MAX(CASE WHEN a.status = 'completed' THEN a.appointment_date END) last_visit,
      MIN(CASE WHEN a.status IN ('confirmed','pending') AND a.appointment_date >= date('now') THEN a.appointment_date || ' ' || a.start_time END) next_appointment,
      COALESCE((SELECT SUM(pay.amount_sar) FROM payments pay JOIN appointments pa ON pa.id = pay.appointment_id WHERE pa.customer_id = c.id AND pay.status = 'paid'), 0) total_spend
      FROM customers c LEFT JOIN appointments a ON a.customer_id = c.id LEFT JOIN preferences p ON p.customer_id = c.id
      GROUP BY c.id ORDER BY c.updated_at DESC`)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT m.*, c.full_name customer_name FROM messages m LEFT JOIN customers c ON c.id = m.customer_id ORDER BY m.created_at DESC LIMIT 200`,
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        'SELECT id, day_of_week, start_time, end_time, break_start, break_end, enabled FROM availability ORDER BY day_of_week',
      )
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT id, date, reason FROM days_off ORDER BY date')
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT key, value FROM studio_settings')
      .all<{ key: string; value: string }>(),
    db
      .prepare(
        'SELECT id, customer_id, body, created_at FROM notes ORDER BY created_at DESC',
      )
      .all<Record<string, unknown>>(),
  ]);
  const appointments = appointmentRows.results.map(mapAppointment);
  const notesByCustomer = new Map<
    string,
    Array<{ id: string; body: string; createdAt: string }>
  >();
  for (const row of noteRows.results) {
    const key = asText(row.customer_id);
    const list = notesByCustomer.get(key) || [];
    list.push({
      id: asText(row.id),
      body: asText(row.body),
      createdAt: asText(row.created_at),
    });
    notesByCustomer.set(key, list);
  }
  const clients: Client[] = clientRows.results.map((row) => ({
    id: asText(row.id),
    fullName: asText(row.full_name),
    phone: asText(row.phone),
    email: nullable(row.email),
    preferredContact: asText(row.preferred_contact),
    createdAt: asText(row.created_at),
    totalVisits: Number(row.total_visits || 0),
    lastVisit: nullable(row.last_visit),
    nextAppointment: nullable(row.next_appointment),
    totalSpend: Number(row.total_spend || 0),
    preferredShape: nullable(row.preferred_shape),
    preferredColors: nullable(row.preferred_colors),
    appointmentStyle: nullable(row.appointment_style),
    notes: notesByCustomer.get(asText(row.id)) || [],
  }));
  const today = localRiyadhDateTime().date;
  const todayAppointments = appointments.filter(
    (item) => item.appointmentDate === today && item.status !== 'cancelled',
  );
  const upcoming = appointments.filter(
    (item) =>
      item.appointmentDate >= today &&
      !['cancelled', 'completed', 'no-show'].includes(item.status),
  );
  const cancelled = appointments.filter(
    (item) => item.status === 'cancelled',
  ).length;
  const completed = appointments.filter(
    (item) => item.status === 'completed',
  ).length;
  const attendedBase =
    completed + appointments.filter((item) => item.status === 'no-show').length;
  const revenue = clients.reduce((sum, client) => sum + client.totalSpend, 0);
  const paidBookings = appointments.filter(
    (item) => item.recordedPaymentSar !== null,
  );
  return {
    appointments,
    clients,
    services: serviceRows.results.map(mapService),
    messages: messageRows.results.map((row) => ({
      id: asText(row.id),
      customerName: nullable(row.customer_name),
      kind: asText(row.kind),
      channel: asText(row.channel),
      body: asText(row.body),
      status: asText(row.status),
      scheduledFor: nullable(row.scheduled_for),
      createdAt: asText(row.created_at),
    })),
    availability: availabilityRows.results.map((row) => ({
      id: asText(row.id),
      dayOfWeek: Number(row.day_of_week),
      startTime: asText(row.start_time),
      endTime: asText(row.end_time),
      breakStart: nullable(row.break_start),
      breakEnd: nullable(row.break_end),
      enabled: Number(row.enabled) === 1,
    })),
    daysOff: daysOffRows.results.map((row) => ({
      id: asText(row.id),
      date: asText(row.date),
      reason: nullable(row.reason),
    })),
    settings: {
      bufferMinutes: Number(
        settingRows.results.find((row) => row.key === 'buffer_minutes')
          ?.value || 15,
      ),
      timezone:
        settingRows.results.find((row) => row.key === 'timezone')?.value ||
        'Asia/Riyadh',
    },
    metrics: {
      todayAppointments: todayAppointments.length,
      upcomingAppointments: upcoming.length,
      newClients: clients.filter(
        (client) => client.createdAt.slice(0, 7) === today.slice(0, 7),
      ).length,
      revenue,
      cancellationRate: appointments.length
        ? Math.round((cancelled / appointments.length) * 100)
        : 0,
      attendanceRate: attendedBase
        ? Math.round((completed / attendedBase) * 100)
        : 100,
      averageBookingValue: paidBookings.length
        ? Math.round(revenue / paidBookings.length)
        : 0,
      returningClients: clients.filter((client) => client.totalVisits > 1)
        .length,
    },
  };
}

export async function studioMutation(input: Record<string, unknown>) {
  const db = getD1();
  const now = new Date().toISOString();
  const action = asText(input.action);
  if (action === 'appointment-status') {
    const id = asText(input.id);
    const status = asText(input.status);
    if (
      !['confirmed', 'pending', 'completed', 'cancelled', 'no-show'].includes(
        status,
      )
    )
      throw new Error('Invalid appointment status.');
    if (status === 'cancelled') {
      await db.batch([
        db
          .prepare('DELETE FROM appointment_slots WHERE appointment_id = ?')
          .bind(id),
        db
          .prepare(
            "UPDATE appointments SET status = 'cancelled', slot_key = NULL, updated_at = ? WHERE id = ?",
          )
          .bind(now, id),
      ]);
    } else if (status === 'confirmed') {
      const appointment = await db
        .prepare(
          'SELECT service_id, appointment_date, start_time, status FROM appointments WHERE id = ?',
        )
        .bind(id)
        .first<{
          service_id: string;
          appointment_date: string;
          start_time: string;
          status: string;
        }>();
      if (!appointment) throw new Error('Appointment not found.');
      if (appointment.status === 'cancelled') {
        const available = await listAvailableTimes(
          appointment.service_id,
          appointment.appointment_date,
          id,
        );
        if (!available.includes(appointment.start_time))
          throw new Error('That time is no longer available.');
        const service = await db
          .prepare('SELECT duration_minutes FROM services WHERE id = ?')
          .bind(appointment.service_id)
          .first<{ duration_minutes: number }>();
        if (!service) throw new Error('Service unavailable.');
        const buffer = await getBufferMinutes(db);
        try {
          await db.batch([
            db
              .prepare(
                "UPDATE appointments SET status = 'confirmed', slot_key = ?, updated_at = ? WHERE id = ?",
              )
              .bind(
                `${appointment.appointment_date}|${appointment.start_time}|staff_owner`,
                now,
                id,
              ),
            ...reservationSlotKeys(
              appointment.appointment_date,
              appointment.start_time,
              service.duration_minutes,
              buffer,
            ).map((occupiedSlot) =>
              db
                .prepare(
                  'INSERT INTO appointment_slots (slot_key, appointment_id, created_at) VALUES (?, ?, ?)',
                )
                .bind(occupiedSlot, id, now),
            ),
          ]);
        } catch (error) {
          if (isUniqueConflict(error))
            throw new Error('That time is no longer available.');
          throw error;
        }
      } else {
        await db
          .prepare(
            "UPDATE appointments SET status = 'confirmed', updated_at = ? WHERE id = ?",
          )
          .bind(now, id)
          .run();
      }
    } else {
      await db
        .prepare(
          'UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?',
        )
        .bind(status, now, id)
        .run();
    }
  } else if (action === 'appointment-note') {
    const body = clean(asText(input.body));
    if (!body) throw new Error('Write a note first.');
    const appointment = await db
      .prepare('SELECT customer_id FROM appointments WHERE id = ?')
      .bind(asText(input.id))
      .first<{ customer_id: string }>();
    if (!appointment) throw new Error('Appointment not found.');
    await db.batch([
      db
        .prepare(
          'INSERT INTO notes (id, customer_id, appointment_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(
          crypto.randomUUID(),
          appointment.customer_id,
          asText(input.id),
          body,
          now,
        ),
      db
        .prepare(
          'UPDATE appointments SET internal_notes = ?, updated_at = ? WHERE id = ?',
        )
        .bind(body, now, asText(input.id)),
    ]);
  } else if (action === 'appointment-reschedule') {
    const id = asText(input.id);
    const date = asText(input.date);
    const time = asText(input.time);
    const appointment = await db
      .prepare('SELECT service_id FROM appointments WHERE id = ?')
      .bind(id)
      .first<{ service_id: string }>();
    if (!appointment) throw new Error('Appointment not found.');
    const available = await listAvailableTimes(
      appointment.service_id,
      date,
      id,
    );
    if (!available.includes(time)) throw new Error('That time is unavailable.');
    const service = await db
      .prepare('SELECT duration_minutes FROM services WHERE id = ?')
      .bind(appointment.service_id)
      .first<{ duration_minutes: number }>();
    const endTime = fromMinutes(
      toMinutes(time) + Number(service?.duration_minutes || 45),
    );
    const buffer = await getBufferMinutes(db);
    try {
      await db.batch([
        db
          .prepare('DELETE FROM appointment_slots WHERE appointment_id = ?')
          .bind(id),
        db
          .prepare(
            "UPDATE appointments SET appointment_date = ?, start_time = ?, end_time = ?, slot_key = ?, status = 'confirmed', updated_at = ? WHERE id = ?",
          )
          .bind(date, time, endTime, `${date}|${time}|staff_owner`, now, id),
        ...reservationSlotKeys(
          date,
          time,
          Number(service?.duration_minutes || 45),
          buffer,
        ).map((occupiedSlot) =>
          db
            .prepare(
              'INSERT INTO appointment_slots (slot_key, appointment_id, created_at) VALUES (?, ?, ?)',
            )
            .bind(occupiedSlot, id, now),
        ),
      ]);
    } catch (error) {
      if (isUniqueConflict(error))
        throw new Error('That time has just become unavailable.');
      throw error;
    }
  } else if (action === 'service-save') {
    const id = asText(input.id) || crypto.randomUUID();
    const name = clean(asText(input.name));
    const description = clean(asText(input.description));
    const duration = Math.max(
      15,
      Math.min(360, Number(input.durationMinutes || 45)),
    );
    const price =
      input.priceSar === '' ||
      input.priceSar === null ||
      input.priceSar === undefined
        ? null
        : Math.max(0, Number(input.priceSar));
    if (!name || !description)
      throw new Error('Service name and description are required.');
    const slug = asText(input.slug) || slugify(name);
    await db
      .prepare(`INSERT INTO services (id, slug, name, description, duration_minutes, price_sar, availability, status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, name=excluded.name, description=excluded.description,
      duration_minutes=excluded.duration_minutes, price_sar=excluded.price_sar, availability=excluded.availability,
      status=excluded.status, sort_order=excluded.sort_order, updated_at=excluded.updated_at`)
      .bind(
        id,
        slug,
        name,
        description,
        duration,
        price,
        asText(input.availability, 'booking'),
        asText(input.status, 'active'),
        Number(input.sortOrder || 99),
        now,
        now,
      )
      .run();
  } else if (action === 'service-archive') {
    await db
      .prepare(
        "UPDATE services SET status = 'archived', updated_at = ? WHERE id = ?",
      )
      .bind(now, asText(input.id))
      .run();
  } else if (action === 'availability-save') {
    const rules = Array.isArray(input.rules) ? input.rules : [];
    const statements = rules.map((value) => {
      const rule = value as Record<string, unknown>;
      return db
        .prepare(`INSERT INTO availability (id, day_of_week, start_time, end_time, break_start, break_end, enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(day_of_week) DO UPDATE SET start_time=excluded.start_time, end_time=excluded.end_time,
        break_start=excluded.break_start, break_end=excluded.break_end, enabled=excluded.enabled, updated_at=excluded.updated_at`)
        .bind(
          `availability_${Number(rule.dayOfWeek)}`,
          Number(rule.dayOfWeek),
          asText(rule.startTime),
          asText(rule.endTime),
          nullable(rule.breakStart),
          nullable(rule.breakEnd),
          rule.enabled ? 1 : 0,
          now,
        );
    });
    statements.push(
      db
        .prepare(
          "INSERT INTO studio_settings (key, value, updated_at) VALUES ('buffer_minutes', ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        )
        .bind(String(Math.max(0, Number(input.bufferMinutes || 0))), now),
    );
    await db.batch(statements);
  } else if (action === 'day-off-add') {
    const date = asText(input.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a date.');
    await db
      .prepare(
        'INSERT OR IGNORE INTO days_off (id, date, reason, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(crypto.randomUUID(), date, clean(asText(input.reason)) || null, now)
      .run();
  } else if (action === 'day-off-remove') {
    await db
      .prepare('DELETE FROM days_off WHERE id = ?')
      .bind(asText(input.id))
      .run();
  } else if (action === 'client-preferences') {
    const customerId = asText(input.customerId);
    await db
      .prepare(`INSERT INTO preferences (id, customer_id, preferred_shape, preferred_colors, appointment_style, updated_at)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(customer_id) DO UPDATE SET preferred_shape=excluded.preferred_shape,
      preferred_colors=excluded.preferred_colors, appointment_style=excluded.appointment_style, updated_at=excluded.updated_at`)
      .bind(
        crypto.randomUUID(),
        customerId,
        clean(asText(input.preferredShape)) || null,
        clean(asText(input.preferredColors)) || null,
        clean(asText(input.appointmentStyle)) || null,
        now,
      )
      .run();
  } else if (action === 'payment-record') {
    const appointmentId = asText(input.appointmentId);
    const appointment = await db
      .prepare('SELECT quoted_price_sar FROM appointments WHERE id = ?')
      .bind(appointmentId)
      .first<{ quoted_price_sar: number | null }>();
    if (!appointment || appointment.quoted_price_sar === null)
      throw new Error('Set a service price before recording payment.');
    await db.batch([
      db
        .prepare(
          "DELETE FROM payments WHERE appointment_id = ? AND status = 'paid'",
        )
        .bind(appointmentId),
      db
        .prepare(`INSERT INTO payments (id, appointment_id, amount_sar, status, paid_at, created_at)
        VALUES (?, ?, ?, 'paid', ?, ?)`)
        .bind(
          crypto.randomUUID(),
          appointmentId,
          appointment.quoted_price_sar,
          now,
          now,
        ),
    ]);
  } else if (action === 'payment-remove') {
    await db
      .prepare(
        "DELETE FROM payments WHERE appointment_id = ? AND status = 'paid'",
      )
      .bind(asText(input.appointmentId))
      .run();
  } else if (action === 'client-note') {
    const body = clean(asText(input.body));
    if (!body) throw new Error('Write a note first.');
    await db
      .prepare(
        'INSERT INTO notes (id, customer_id, body, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(crypto.randomUUID(), asText(input.customerId), body, now)
      .run();
  } else if (action === 'message-create') {
    const body = clean(asText(input.body));
    if (!body) throw new Error('Write a message first.');
    await db
      .prepare(`INSERT INTO messages (id, customer_id, kind, channel, body, status, created_at)
      VALUES (?, ?, 'manual', ?, ?, 'draft', ?)`)
      .bind(
        crypto.randomUUID(),
        input.customerId ? asText(input.customerId) : null,
        asText(input.channel, 'whatsapp'),
        body,
        now,
      )
      .run();
  } else {
    throw new Error('Unknown studio action.');
  }
  return { ok: true };
}

function mapService(row: Record<string, unknown>): Service {
  return {
    id: asText(row.id),
    slug: asText(row.slug),
    name: asText(row.name),
    description: asText(row.description),
    durationMinutes: Number(row.duration_minutes),
    priceSar:
      row.price_sar === null || row.price_sar === undefined
        ? null
        : Number(row.price_sar),
    availability: asText(row.availability),
    status: asText(row.status),
    sortOrder: Number(row.sort_order),
  };
}

function mapAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: asText(row.id),
    appointmentDate: asText(row.appointment_date),
    startTime: asText(row.start_time),
    endTime: asText(row.end_time),
    durationMinutes: Number(row.duration_minutes),
    quotedPriceSar:
      row.quoted_price_sar === null || row.quoted_price_sar === undefined
        ? null
        : Number(row.quoted_price_sar),
    recordedPaymentSar:
      row.recorded_payment_sar === null ||
      row.recorded_payment_sar === undefined
        ? null
        : Number(row.recorded_payment_sar),
    paymentStatus: nullable(row.payment_status),
    status: asText(row.status),
    customerNotes: nullable(row.customer_notes),
    internalNotes: nullable(row.internal_notes),
    customerId: asText(row.customer_id),
    customerName: asText(row.customer_name),
    customerPhone: asText(row.customer_phone),
    customerEmail: nullable(row.customer_email),
    preferredContact: asText(row.preferred_contact),
    serviceId: asText(row.service_id),
    serviceName: asText(row.service_name),
  };
}

function validateBookingInput(input: BookingInput) {
  if (
    !input.serviceId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !/^\d{2}:\d{2}$/.test(input.time)
  )
    throw new Error('Complete your service, date and time.');
  if (clean(input.fullName).length < 2)
    throw new Error('Enter your full name.');
  if (normalizePhone(input.phone).replace(/\D/g, '').length < 8)
    throw new Error('Enter a valid mobile number.');
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    throw new Error('Enter a valid email address.');
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 1000);
}
function normalizePhone(value: string) {
  return value
    .trim()
    .replace(/[^\d+]/g, '')
    .slice(0, 20);
}
function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return `${value}`;
  return fallback;
}
function nullable(value: unknown): string | null {
  const text = asText(value);
  return text || null;
}
function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || crypto.randomUUID()
  );
}
function toMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
function fromMinutes(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
async function getBufferMinutes(db: D1Database) {
  const row = await db
    .prepare("SELECT value FROM studio_settings WHERE key = 'buffer_minutes'")
    .first<{ value: string }>();
  return Math.max(0, Number(row?.value || 0));
}
function reservationSlotKeys(
  date: string,
  startTime: string,
  durationMinutes: number,
  bufferMinutes: number,
) {
  const start = toMinutes(startTime);
  const end = start + durationMinutes + bufferMinutes;
  const slots: string[] = [];
  for (let cursor = start; cursor < end; cursor += 30) {
    slots.push(`${date}|${fromMinutes(cursor)}|staff_owner`);
  }
  return slots;
}
function isUniqueConflict(error: unknown) {
  const message = error instanceof Error ? error.message : asText(error);
  return message.toLowerCase().includes('unique');
}
function formatHumanDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeZone: 'Asia/Riyadh',
  }).format(new Date(`${value}T12:00:00+03:00`));
}
function localRiyadhDateTime() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}
