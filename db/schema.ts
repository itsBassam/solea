import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  preferredContact: text('preferred_contact').notNull().default('whatsapp'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_customers_phone').on(table.phone), index('idx_customers_email').on(table.email)]);

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  priceSar: real('price_sar'),
  availability: text('availability').notNull().default('booking'),
  status: text('status').notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_services_slug').on(table.slug), index('idx_services_status_sort').on(table.status, table.sortOrder)]);

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  serviceId: text('service_id').notNull().references(() => services.id),
  staffId: text('staff_id').references(() => staff.id),
  appointmentDate: text('appointment_date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  quotedPriceSar: real('quoted_price_sar'),
  status: text('status').notNull().default('confirmed'),
  customerNotes: text('customer_notes'),
  internalNotes: text('internal_notes'),
  slotKey: text('slot_key'),
  manageToken: text('manage_token').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  uniqueIndex('idx_appointments_slot_key').on(table.slotKey),
  index('idx_appointments_date_status').on(table.appointmentDate, table.status),
  index('idx_appointments_customer').on(table.customerId),
  index('idx_appointments_service').on(table.serviceId),
]);

export const availability = sqliteTable('availability', {
  id: text('id').primaryKey(),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  breakStart: text('break_start'),
  breakEnd: text('break_end'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  updatedAt: text('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_availability_day').on(table.dayOfWeek)]);

export const daysOff = sqliteTable('days_off', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  reason: text('reason'),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('idx_days_off_date').on(table.date)]);

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  kind: text('kind').notNull(),
  channel: text('channel').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('draft'),
  scheduledFor: text('scheduled_for'),
  sentAt: text('sent_at'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_messages_customer_created').on(table.customerId, table.createdAt), index('idx_messages_status_schedule').on(table.status, table.scheduledFor)]);

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  appointmentId: text('appointment_id').notNull().references(() => appointments.id),
  amountSar: real('amount_sar').notNull(),
  status: text('status').notNull().default('paid'),
  method: text('method'),
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_payments_appointment').on(table.appointmentId), index('idx_payments_status').on(table.status)]);

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_notes_customer_created').on(table.customerId, table.createdAt)]);

export const preferences = sqliteTable('preferences', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  preferredShape: text('preferred_shape'),
  preferredColors: text('preferred_colors'),
  appointmentStyle: text('appointment_style'),
  updatedAt: text('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_preferences_customer').on(table.customerId)]);

export const studioSettings = sqliteTable('studio_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});
