'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Service } from '@/lib/crm-types';

type Confirmation = {
  id: string;
  manageToken: string;
  service: string;
  date: string;
  time: string;
  endTime: string;
  durationMinutes: number;
  priceSar: number | null;
  customerName: string;
  status: string;
};

type BookingPayload = {
  serviceId: string;
  date: string;
  time: string;
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
  preferredContact?: string;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: Record<string, unknown>,
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

const STEP_LABELS = [
  'Choose your moment',
  'Choose your time',
  'Your details',
  'Confirmation',
];

export default function BookingExperience() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [details, setDetails] = useState({
    fullName: '',
    phone: '',
    email: '',
    notes: '',
    preferredContact: 'whatsapp',
  });
  const selectedService =
    services.find((service) => service.id === serviceId) || null;
  const dates = useMemo(() => makeDates(21), []);

  useEffect(() => {
    fetch('/api/services')
      .then(async (response) => {
        const payload = (await response.json()) as {
          services: Service[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error);
        setServices(payload.services);
        const requested = new URLSearchParams(window.location.search).get(
          'service',
        );
        if (
          requested &&
          payload.services.some((service) => service.id === requested)
        ) {
          setServiceId(requested);
          setStep(2);
        }
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : 'Services are unavailable.',
        ),
      )
      .finally(() => setLoadingServices(false));
  }, []);

  useEffect(() => {
    if (!serviceId || !date) return;
    fetch(
      `/api/availability?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`,
    )
      .then(async (response) => {
        const payload = (await response.json()) as {
          times: string[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error);
        setTimes(payload.times);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : 'Times are unavailable.',
        ),
      )
      .finally(() => setLoadingTimes(false));
  }, [serviceId, date]);

  const submitPayload = useCallback(async (payload: BookingPayload) => {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as {
      appointment: Confirmation;
      error?: string;
    };
    if (!response.ok)
      throw new Error(result.error || 'Unable to reserve this moment.');
    setServiceId(payload.serviceId);
    setDate(payload.date);
    setTime(payload.time);
    setDetails({
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email || '',
      notes: payload.notes || '',
      preferredContact: payload.preferredContact || 'whatsapp',
    });
    setConfirmation(result.appointment);
    setStep(4);
    return result.appointment as Confirmation;
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'create_solea_booking',
            title: 'Reserve a SOLÉA.Co moment',
            description:
              'Creates a real SOLÉA.Co appointment using an available service, date and time, then shows the same confirmation as the booking page.',
            inputSchema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                serviceId: { type: 'string' },
                date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                fullName: { type: 'string', minLength: 2 },
                phone: { type: 'string', minLength: 8 },
                email: { type: 'string' },
                notes: { type: 'string' },
                preferredContact: {
                  type: 'string',
                  enum: ['whatsapp', 'sms', 'email'],
                },
              },
              required: ['serviceId', 'date', 'time', 'fullName', 'phone'],
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: async (input: unknown) => {
              const value = input as BookingPayload;
              const appointment = await submitPayload(value);
              return {
                id: appointment.id,
                status: appointment.status,
                date: appointment.date,
                time: appointment.time,
                service: appointment.service,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => undefined);
    } catch {
      /* Unsupported browser implementation. */
    }
    return () => lifecycle.abort();
  }, [submitPayload]);

  async function reserve(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await submitPayload({ serviceId, date, time, ...details });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to reserve this moment.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateReservation(action: 'cancel' | 'reschedule') {
    if (!confirmation) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: confirmation.id,
          manageToken: confirmation.manageToken,
          action,
          date,
          time,
        }),
      });
      const result = (await response.json()) as {
        appointment: { endTime?: string };
        error?: string;
      };
      if (!response.ok) throw new Error(result.error);
      if (action === 'cancel')
        setConfirmation((current) =>
          current ? { ...current, status: 'cancelled' } : current,
        );
      else {
        setConfirmation((current) =>
          current
            ? {
                ...current,
                date,
                time,
                endTime: result.appointment.endTime || current.endTime,
                status: 'confirmed',
              }
            : current,
        );
        setStep(4);
        setRescheduling(false);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to update the appointment.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function beginReschedule() {
    setRescheduling(true);
    setDate('');
    setTime('');
    setStep(2);
  }

  return (
    <main className="booking-page">
      <header className="booking-topbar">
        <Link className="booking-logo" href="/" aria-label="SOLÉA.Co home">
          <img src="/media/solea-logo-dark.png" alt="SOLÉA.Co" />
        </Link>
        <Link href="/" className="booking-back">
          Return to the atelier <ArrowUpRight aria-hidden="true" size={15} />
        </Link>
      </header>

      <section className="booking-intro">
        <p className="eyebrow">SOLÉA.Co CONCIERGE</p>
        <h1>
          Book your <em>moment.</em>
        </h1>
        <p>
          Take a little time for yourself. Choose your service and we’ll take
          care of the details.
        </p>
      </section>

      <nav className="booking-progress" aria-label="Booking progress">
        {STEP_LABELS.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-current={step === index + 1 ? 'step' : undefined}
            className={
              step === index + 1 ? 'active' : step > index + 1 ? 'complete' : ''
            }
            onClick={() => index + 1 < step && setStep(index + 1)}
            disabled={index + 1 > step}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {label}
          </button>
        ))}
      </nav>

      {selectedService && (step === 2 || step === 3) && (
        <aside
          className="booking-selection-bar"
          aria-label="Your booking summary"
        >
          <div>
            <span>YOUR MOMENT</span>
            <strong>{selectedService.name}</strong>
          </div>
          <div>
            <span>DATE</span>
            <strong>{date ? formatDate(date) : 'Choose a date'}</strong>
          </div>
          <div>
            <span>TIME</span>
            <strong>{time ? displayTime(time) : 'Choose a time'}</strong>
          </div>
          <div>
            <span>DURATION</span>
            <strong>{selectedService.durationMinutes} min</strong>
          </div>
          <div>
            <span>PRICE</span>
            <strong>
              {selectedService.priceSar === null
                ? 'By studio'
                : `SAR ${formatMoney(selectedService.priceSar)}`}
            </strong>
          </div>
        </aside>
      )}

      <div className="booking-stage" aria-live="polite">
        {error && (
          <p className="booking-error" role="alert">
            {error}
          </p>
        )}

        {step === 1 && (
          <section className="booking-panel">
            <div className="panel-heading">
              <p className="eyebrow">01 — CHOOSE YOUR MOMENT</p>
              <h2>
                What feels like <em>you?</em>
              </h2>
            </div>
            {loadingServices ? (
              <div className="booking-skeleton" aria-label="Loading services">
                <span />
                <span />
                <span />
              </div>
            ) : (
              <div className="moment-list">
                {services.map((service, index) => (
                  <article
                    className={`moment-card ${serviceId === service.id ? 'selected' : ''}`}
                    key={service.id}
                  >
                    <div className="moment-number">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="moment-copy">
                      <h3>{service.name}</h3>
                      <p>{service.description}</p>
                    </div>
                    <div className="moment-meta">
                      <span>{service.durationMinutes} min</span>
                      <span>
                        {service.priceSar === null
                          ? 'Price confirmed by studio'
                          : `SAR ${formatMoney(service.priceSar)}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceId(service.id);
                        setDate('');
                        setTime('');
                        setTimes([]);
                        setError('');
                        setStep(2);
                      }}
                    >
                      <span>
                        {serviceId === service.id ? 'Selected' : 'Select'}
                      </span>
                      <ArrowUpRight aria-hidden="true" size={16} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="booking-panel time-panel">
            <div className="panel-heading">
              <p className="eyebrow">02 — CHOOSE YOUR TIME</p>
              <h2>
                A pause in <em>your day.</em>
              </h2>
              <p>
                {selectedService?.name} · {selectedService?.durationMinutes}{' '}
                minutes
              </p>
            </div>
            <div className="date-strip" aria-label="Choose a date">
              {dates.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={date === item.value ? 'selected' : ''}
                  onClick={() => {
                    setDate(item.value);
                    setTime('');
                    setTimes([]);
                    setError('');
                    setLoadingTimes(true);
                  }}
                >
                  <span>{item.weekday}</span>
                  <strong>{item.day}</strong>
                  <small>{item.month}</small>
                </button>
              ))}
            </div>
            {date && (
              <div className="time-choice">
                <p className="eyebrow">AVAILABLE TIMES</p>
                {loadingTimes ? (
                  <p className="quiet-state">
                    Preparing your available moments…
                  </p>
                ) : times.length ? (
                  <div className="time-grid">
                    {times.map((item) => (
                      <button
                        type="button"
                        className={time === item ? 'selected' : ''}
                        onClick={() => setTime(item)}
                        key={item}
                      >
                        {displayTime(item)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="quiet-state">
                    No moments remain on this day. Choose another date.
                  </p>
                )}
              </div>
            )}
            <div className="panel-actions">
              <button
                className="booking-ghost"
                type="button"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              {rescheduling ? (
                <button
                  className="booking-primary"
                  type="button"
                  disabled={!time || submitting}
                  onClick={() => updateReservation('reschedule')}
                >
                  {submitting ? 'Saving…' : 'Confirm new time'}
                  <ArrowUpRight aria-hidden="true" size={16} />
                </button>
              ) : (
                <button
                  className="booking-primary"
                  type="button"
                  disabled={!time}
                  onClick={() => setStep(3)}
                >
                  Continue <ArrowUpRight aria-hidden="true" size={16} />
                </button>
              )}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="booking-panel details-panel">
            <div className="panel-heading">
              <p className="eyebrow">03 — YOUR DETAILS</p>
              <h2>
                Just the <em>essentials.</em>
              </h2>
              <p>We’ll use these details only for your appointment.</p>
            </div>
            <form onSubmit={reserve} className="details-form">
              <label>
                <span>Full name</span>
                <input
                  required
                  minLength={2}
                  autoComplete="name"
                  value={details.fullName}
                  onChange={(event) =>
                    setDetails({ ...details, fullName: event.target.value })
                  }
                  placeholder="Your name"
                />
              </label>
              <label>
                <span>Mobile number</span>
                <input
                  required
                  minLength={8}
                  inputMode="tel"
                  autoComplete="tel"
                  value={details.phone}
                  onChange={(event) =>
                    setDetails({ ...details, phone: event.target.value })
                  }
                  placeholder="+966"
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={details.email}
                  onChange={(event) =>
                    setDetails({ ...details, email: event.target.value })
                  }
                  placeholder="Optional"
                />
              </label>
              <label className="full">
                <span>Anything you’d like us to know?</span>
                <textarea
                  value={details.notes}
                  onChange={(event) =>
                    setDetails({ ...details, notes: event.target.value })
                  }
                  placeholder="Optional notes"
                  rows={3}
                />
              </label>
              <fieldset className="full contact-choice">
                <legend>Preferred contact</legend>
                {['whatsapp', 'sms', 'email'].map((method) => (
                  <button
                    type="button"
                    key={method}
                    aria-pressed={details.preferredContact === method}
                    className={
                      details.preferredContact === method ? 'selected' : ''
                    }
                    onClick={() =>
                      setDetails({ ...details, preferredContact: method })
                    }
                  >
                    {method === 'sms' ? 'SMS' : titleCase(method)}
                  </button>
                ))}
              </fieldset>
              <div className="booking-summary full">
                <div>
                  <span>{selectedService?.name}</span>
                  <small>
                    {formatDate(date)} · {displayTime(time)}
                  </small>
                </div>
                <strong>
                  {selectedService?.priceSar === null
                    ? 'Price confirmed by studio'
                    : `SAR ${formatMoney(selectedService?.priceSar || 0)}`}
                </strong>
              </div>
              <div className="panel-actions full">
                <button
                  className="booking-ghost"
                  type="button"
                  onClick={() => setStep(2)}
                >
                  Back
                </button>
                <button
                  className="booking-primary"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? 'Reserving…' : 'Reserve my moment'}
                  <ArrowUpRight aria-hidden="true" size={16} />
                </button>
              </div>
            </form>
          </section>
        )}

        {step === 4 && confirmation && (
          <section className="confirmation-panel">
            <p className="eyebrow">04 — CONFIRMATION</p>
            <div className="confirmation-mark" aria-hidden="true">
              S
            </div>
            <h2>
              {confirmation.status === 'cancelled' ? (
                <>
                  Your moment is <em>cancelled.</em>
                </>
              ) : (
                <>
                  Your moment is <em>reserved.</em>
                </>
              )}
            </h2>
            <p>
              {confirmation.status === 'cancelled'
                ? 'Whenever you’re ready, a new little luxury will be waiting.'
                : 'Everything is ready for you.'}
            </p>
            <dl>
              <div>
                <dt>Service</dt>
                <dd>{confirmation.service}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(confirmation.date)}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{displayTime(confirmation.time)}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{confirmation.durationMinutes} min</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>
                  {confirmation.priceSar === null
                    ? 'By studio'
                    : `SAR ${formatMoney(confirmation.priceSar)}`}
                </dd>
              </div>
              <div>
                <dt>Reserved for</dt>
                <dd>{confirmation.customerName}</dd>
              </div>
            </dl>
            {confirmation.status !== 'cancelled' && (
              <div className="confirmation-actions">
                <button
                  type="button"
                  onClick={() => downloadCalendar(confirmation)}
                >
                  Add to calendar
                </button>
                <button type="button" onClick={beginReschedule}>
                  Reschedule
                </button>
                <button
                  type="button"
                  className="danger-link"
                  disabled={submitting}
                  onClick={() => updateReservation('cancel')}
                >
                  Cancel appointment
                </button>
              </div>
            )}
            {confirmation.status === 'cancelled' && (
              <Link className="booking-primary" href="/booking">
                Book another moment{' '}
                <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
            )}
          </section>
        )}
      </div>
      <footer className="booking-footer">
        <span>SOLÉA.Co</span>
        <p>A little time for yourself.</p>
        <Link href="/studio">Studio</Link>
      </footer>
    </main>
  );
}

function makeDates(count: number) {
  const formatterDay = new Intl.DateTimeFormat('en', { weekday: 'short' });
  const formatterMonth = new Intl.DateTimeFormat('en', { month: 'short' });
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: localDateValue(date),
      weekday: formatterDay.format(date).toUpperCase(),
      day: String(date.getDate()).padStart(2, '0'),
      month: formatterMonth.format(date).toUpperCase(),
    };
  });
}
function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function displayTime(value: string) {
  if (!value) return '';
  const [hour, minute] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(2000, 0, 1, hour, minute));
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`));
}
function formatMoney(value: number) {
  return new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(
    value,
  );
}
function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function downloadCalendar(appointment: Confirmation) {
  const start = `${appointment.date.replace(/-/g, '')}T${appointment.time.replace(':', '')}00`;
  const end = `${appointment.date.replace(/-/g, '')}T${appointment.endTime.replace(':', '')}00`;
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@solea.co`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:SOLÉA.Co — ${appointment.service}`,
    'DESCRIPTION:Your SOLÉA.Co moment.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/calendar' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'solea-appointment.ics';
  link.click();
  URL.revokeObjectURL(url);
}
