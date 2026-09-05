'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import type { Appointment, Client, Service, StudioData } from '@/lib/crm-types';

type View =
  | 'overview'
  | 'appointments'
  | 'clients'
  | 'services'
  | 'calendar'
  | 'messages'
  | 'analytics'
  | 'settings';
const NAV: Array<{ id: View; label: string; mark: string }> = [
  { id: 'overview', label: 'Overview', mark: 'O' },
  { id: 'appointments', label: 'Appointments', mark: 'A' },
  { id: 'clients', label: 'Clients', mark: 'C' },
  { id: 'services', label: 'Services', mark: 'S' },
  { id: 'calendar', label: 'Calendar', mark: 'D' },
  { id: 'messages', label: 'Messages', mark: 'M' },
  { id: 'analytics', label: 'Analytics', mark: 'N' },
  { id: 'settings', label: 'Settings', mark: 'T' },
];

export default function StudioShell({
  ownerName,
  signOutPath,
}: {
  ownerName: string;
  signOutPath: string;
}) {
  const [view, setView] = useState<View>('overview');
  const [data, setData] = useState<StudioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/studio', { cache: 'no-store' });
      const result = (await response.json()) as StudioData & { error?: string };
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Studio unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  async function mutate(payload: Record<string, unknown>) {
    setError('');
    const response = await fetch('/api/studio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error || 'Unable to save changes.');
      return false;
    }
    await refresh();
    return true;
  }

  function navigate(next: View) {
    setView(next);
    setSelectedAppointment(null);
    setSelectedClient(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="studio-app">
      <aside className="studio-sidebar">
        <Link className="studio-wordmark" href="/">
          <span>SOLÉA.Co</span>
          <small>STUDIO</small>
        </Link>
        <nav aria-label="Studio navigation">
          {NAV.map((item) => (
            <button
              type="button"
              key={item.id}
              className={view === item.id ? 'active' : ''}
              onClick={() => navigate(item.id)}
            >
              <span>{item.mark}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="studio-sidefoot">
          <p>
            Your little luxury,
            <br />
            beautifully organised.
          </p>
          <a href={signOutPath}>Sign out</a>
        </div>
      </aside>

      <section className="studio-main">
        <header className="studio-header">
          <div>
            <p className="studio-kicker">SOLÉA.Co STUDIO</p>
            <h1>
              {view === 'overview' ? (
                <>
                  Good morning, <em>{ownerName}.</em>
                </>
              ) : (
                titleFor(view)
              )}
            </h1>
            {view === 'overview' && (
              <p>Here’s what your studio looks like today.</p>
            )}
          </div>
          <div className="studio-header-actions">
            <Link href="/booking" target="_blank">
              Open booking <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Refresh Studio"
            >
              Refresh
            </button>
          </div>
        </header>
        {error && (
          <p className="studio-error" role="alert">
            {error}
          </p>
        )}
        {loading && (
          <div className="studio-loading">
            <span>S</span>
            <p>Putting everything in its place…</p>
          </div>
        )}
        {data && (
          <>
            {view === 'overview' && (
              <Overview
                data={data}
                onAppointment={setSelectedAppointment}
                onNavigate={navigate}
              />
            )}
            {view === 'appointments' && (
              <Appointments
                data={data}
                onAppointment={setSelectedAppointment}
              />
            )}
            {view === 'clients' && (
              <Clients data={data} onClient={setSelectedClient} />
            )}
            {view === 'services' && <Services data={data} mutate={mutate} />}
            {view === 'calendar' && (
              <CalendarView
                data={data}
                mutate={mutate}
                onAppointment={setSelectedAppointment}
              />
            )}
            {view === 'messages' && <Messages data={data} mutate={mutate} />}
            {view === 'analytics' && <Analytics data={data} />}
            {view === 'settings' && <Settings data={data} mutate={mutate} />}
          </>
        )}
      </section>

      {selectedAppointment && (
        <AppointmentSheet
          appointment={selectedAppointment}
          close={() => setSelectedAppointment(null)}
          mutate={async (payload) => {
            const ok = await mutate(payload);
            if (ok) setSelectedAppointment(null);
            return ok;
          }}
        />
      )}
      {selectedClient && (
        <ClientSheet
          client={
            data?.clients.find((item) => item.id === selectedClient.id) ||
            selectedClient
          }
          appointments={
            data?.appointments.filter(
              (item) => item.customerId === selectedClient.id,
            ) || []
          }
          close={() => setSelectedClient(null)}
          mutate={mutate}
        />
      )}

      <nav className="studio-mobile-nav" aria-label="Compact Studio navigation">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? 'active' : ''}
            onClick={() => navigate(item.id)}
          >
            <span>{item.mark}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </main>
  );
}

function Overview({
  data,
  onAppointment,
  onNavigate,
}: {
  data: StudioData;
  onAppointment: (item: Appointment) => void;
  onNavigate: (view: View) => void;
}) {
  const today = localDate(new Date());
  const todayAppointments = data.appointments
    .filter(
      (item) => item.appointmentDate === today && item.status !== 'cancelled',
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const needsSetup = data.services.some((service) => service.priceSar === null);
  return (
    <div className="studio-view">
      {needsSetup && (
        <button
          className="setup-note"
          type="button"
          onClick={() => onNavigate('services')}
        >
          <span>Before opening the diary</span>
          <p>
            Review your service prices and starting durations. We kept
            unconfirmed prices blank.
          </p>
          <strong>
            Complete setup <ArrowUpRight aria-hidden="true" size={15} />
          </strong>
        </button>
      )}
      <section className="metric-ribbon">
        <Metric
          label="Today"
          value={String(data.metrics.todayAppointments).padStart(2, '0')}
          detail="Appointments"
        />
        <Metric
          label="New"
          value={String(data.metrics.newClients).padStart(2, '0')}
          detail="Clients"
        />
        <Metric
          label="Revenue"
          value={`SAR ${money(data.metrics.revenue)}`}
          detail="Recorded payments"
        />
        <Metric
          label="Attendance"
          value={`${data.metrics.attendanceRate}%`}
          detail="Completed visits"
        />
      </section>
      <section className="studio-section moments-section">
        <SectionHeading
          eyebrow="TODAY’S MOMENTS"
          title="A quiet rhythm."
          action={
            <button type="button" onClick={() => onNavigate('appointments')}>
              All appointments <ArrowUpRight aria-hidden="true" size={15} />
            </button>
          }
        />
        {todayAppointments.length ? (
          <div className="moment-timeline">
            {todayAppointments.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onAppointment(item)}
              >
                <time>{displayTime(item.startTime)}</time>
                <span>
                  <strong>{item.customerName}</strong>
                  <small>{item.serviceName}</small>
                </span>
                <Status value={item.status} />
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title="A clear diary."
            text="New bookings will appear here the moment they’re reserved."
          />
        )}
      </section>
      <section className="overview-pair">
        <div>
          <SectionHeading eyebrow="COMING UP" title="Next moments." />
          {data.appointments
            .filter(
              (item) =>
                item.appointmentDate >= today &&
                !['cancelled', 'completed'].includes(item.status),
            )
            .slice(0, 4)
            .map((item) => (
              <button
                className="mini-row"
                type="button"
                key={item.id}
                onClick={() => onAppointment(item)}
              >
                <span>{shortDate(item.appointmentDate)}</span>
                <strong>{item.customerName}</strong>
                <small>{item.serviceName}</small>
              </button>
            ))}
        </div>
        <div>
          <SectionHeading eyebrow="CLIENT CARE" title="Personal, always." />
          <p className="editorial-copy">
            Preferences, notes and every past moment live together, so each
            appointment can feel considered before it begins.
          </p>
          <button
            className="text-action"
            type="button"
            onClick={() => onNavigate('clients')}
          >
            Open client book <ArrowUpRight aria-hidden="true" size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

function Appointments({
  data,
  onAppointment,
}: {
  data: StudioData;
  onAppointment: (item: Appointment) => void;
}) {
  const [range, setRange] = useState<'today' | 'week' | 'month'>('week');
  const today = new Date();
  const filtered = data.appointments
    .filter((item) => {
      const value = new Date(`${item.appointmentDate}T12:00:00`);
      if (range === 'today') return item.appointmentDate === localDate(today);
      const days = range === 'week' ? 7 : 31;
      const edge = new Date(today);
      edge.setDate(edge.getDate() + days);
      return value >= new Date(localDate(today) + 'T00:00:00') && value <= edge;
    })
    .sort((a, b) =>
      `${a.appointmentDate}${a.startTime}`.localeCompare(
        `${b.appointmentDate}${b.startTime}`,
      ),
    );
  return (
    <div className="studio-view">
      <div className="view-toolbar">
        <div className="segmented">
          {(['today', 'week', 'month'] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={range === item ? 'active' : ''}
              onClick={() => setRange(item)}
            >
              {titleCase(item)}
            </button>
          ))}
        </div>
        <span>{filtered.length} moments</span>
      </div>
      <section className="appointment-ledger">
        {filtered.length ? (
          filtered.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onAppointment(item)}
            >
              <time>
                <strong>{shortDate(item.appointmentDate)}</strong>
                <span>{displayTime(item.startTime)}</span>
              </time>
              <span className="ledger-client">
                <strong>{item.customerName}</strong>
                <small>{item.customerPhone}</small>
              </span>
              <span>
                <strong>{item.serviceName}</strong>
                <small>{item.durationMinutes} min</small>
              </span>
              <Status value={item.status} />
              <ArrowUpRight
                className="row-arrow"
                aria-hidden="true"
                size={16}
              />
            </button>
          ))
        ) : (
          <Empty
            title="Nothing scheduled here."
            text="Try another view, or open the booking page to reserve a moment."
          />
        )}
      </section>
    </div>
  );
}

function Clients({
  data,
  onClient,
}: {
  data: StudioData;
  onClient: (item: Client) => void;
}) {
  const [query, setQuery] = useState('');
  const clients = data.clients.filter((client) =>
    `${client.fullName} ${client.phone} ${client.email || ''}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="studio-view">
      <div className="client-search">
        <label htmlFor="client-search">Find a client</label>
        <input
          id="client-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, mobile or email"
        />
      </div>
      <div className="client-book">
        {clients.length ? (
          clients.map((client, index) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onClient(client)}
            >
              <span className="client-index">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <strong>{client.fullName}</strong>
                <small>Her SOLÉA.Co moments</small>
              </span>
              <span>
                <strong>{client.totalVisits}</strong>
                <small>visits</small>
              </span>
              <span>
                <strong>SAR {money(client.totalSpend)}</strong>
                <small>spent</small>
              </span>
              <span>
                <strong>
                  {client.nextAppointment
                    ? shortDate(client.nextAppointment.split(' ')[0])
                    : '—'}
                </strong>
                <small>next moment</small>
              </span>
              <ArrowUpRight aria-hidden="true" size={15} />
            </button>
          ))
        ) : (
          <Empty
            title="Your client book is waiting."
            text="A profile is created automatically with the first booking."
          />
        )}
      </div>
    </div>
  );
}

function Services({
  data,
  mutate,
}: {
  data: StudioData;
  mutate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<Service | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div className="studio-view">
      <div className="view-toolbar">
        <p>Set the real duration and price before inviting clients to book.</p>
        <button
          className="wine-button"
          type="button"
          onClick={() => setAdding(true)}
        >
          Add service
        </button>
      </div>
      <div className="service-ledger">
        {data.services.map((service, index) => (
          <article key={service.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{service.name}</h2>
              <p>{service.description}</p>
            </div>
            <dl>
              <div>
                <dt>Duration</dt>
                <dd>{service.durationMinutes} min</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>
                  {service.priceSar === null
                    ? 'Not set'
                    : `SAR ${money(service.priceSar)}`}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{titleCase(service.status)}</dd>
              </div>
            </dl>
            <button type="button" onClick={() => setEditing(service)}>
              Edit <ArrowUpRight aria-hidden="true" size={15} />
            </button>
          </article>
        ))}
      </div>
      {(editing || adding) && (
        <ServiceEditor
          service={editing}
          close={() => {
            setEditing(null);
            setAdding(false);
          }}
          save={mutate}
        />
      )}
    </div>
  );
}

function CalendarView({
  data,
  mutate,
  onAppointment,
}: {
  data: StudioData;
  mutate: (payload: Record<string, unknown>) => Promise<boolean>;
  onAppointment: (item: Appointment) => void;
}) {
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('week');
  const [cursor, setCursor] = useState(() => new Date());
  const days = useMemo(() => calendarDays(cursor, mode), [cursor, mode]);
  const today = localDate(new Date());
  return (
    <div className="studio-view">
      <div
        className="calendar-view-switch segmented"
        aria-label="Calendar view"
      >
        {(['day', 'week', 'month'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={mode === item ? 'active' : ''}
            aria-pressed={mode === item}
            onClick={() => setMode(item)}
          >
            {titleCase(item)}
          </button>
        ))}
      </div>
      <div className="calendar-toolbar">
        <button
          type="button"
          onClick={() => setCursor(moveCalendar(cursor, mode, -1))}
        >
          <ArrowLeft aria-hidden="true" size={15} /> Previous
        </button>
        <div>
          <strong>{calendarLabel(cursor, mode, days)}</strong>
          <button type="button" onClick={() => setCursor(new Date())}>
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCursor(moveCalendar(cursor, mode, 1))}
        >
          Next <ArrowRight aria-hidden="true" size={15} />
        </button>
      </div>
      <div className={`studio-calendar calendar-${mode}`}>
        {days.map((day) => (
          <section
            key={day.value}
            className={`${day.value === today ? 'is-today' : ''} ${day.inMonth ? '' : 'is-outside'}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const id = event.dataTransfer.getData('text/appointment');
              const appointment = data.appointments.find(
                (item) => item.id === id,
              );
              if (appointment)
                void mutate({
                  action: 'appointment-reschedule',
                  id,
                  date: day.value,
                  time: appointment.startTime,
                });
            }}
          >
            <header>
              <span>{day.weekday}</span>
              <strong>{day.day}</strong>
              <small>{day.month}</small>
            </header>
            <div>
              {data.appointments
                .filter(
                  (item) =>
                    item.appointmentDate === day.value &&
                    item.status !== 'cancelled',
                )
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((item) => (
                  <button
                    draggable
                    type="button"
                    key={item.id}
                    onDragStart={(event) =>
                      event.dataTransfer.setData('text/appointment', item.id)
                    }
                    onClick={() => onAppointment(item)}
                  >
                    <time>{displayTime(item.startTime)}</time>
                    <strong>{item.customerName}</strong>
                    <small>{item.serviceName}</small>
                    <Status value={item.status} />
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
      <p className="calendar-note">
        Drag a moment to another day to keep the same time. Availability is
        checked before it moves.
      </p>
    </div>
  );
}

function Messages({
  data,
  mutate,
}: {
  data: StudioData;
  mutate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [customerId, setCustomerId] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [body, setBody] = useState('Your little moment is almost here.');
  async function prepare(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate({
      action: 'message-create',
      customerId: customerId || null,
      channel,
      body,
    });
    if (ok) setBody('');
  }
  return (
    <div className="studio-view messages-layout">
      <section>
        <SectionHeading
          eyebrow="BRAND MESSAGES"
          title="Warm, never automated."
        />
        <div className="automation-list">
          <article>
            <span>When booked</span>
            <strong>Confirmation</strong>
            <p>Your SOLÉA.Co moment is reserved.</p>
          </article>
          <article>
            <span>24 hours before</span>
            <strong>Gentle reminder</strong>
            <p>Your little moment is almost here.</p>
          </article>
          <article>
            <span>After the visit</span>
            <strong>Thank you</strong>
            <p>Thank you for spending a little time with us.</p>
          </article>
          <article>
            <span>7–14 days later</span>
            <strong>Rebooking</strong>
            <p>Ready for your next little luxury?</p>
          </article>
        </div>
      </section>
      <section className="message-composer">
        <p className="studio-kicker">PREPARE A MESSAGE</p>
        <h2>
          Made for <em>her moment.</em>
        </h2>
        <form onSubmit={prepare}>
          <label>
            Client
            <select
              required
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Choose a client</option>
              {data.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Channel
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </label>
          <label>
            Message
            <textarea
              required
              rows={5}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <button className="wine-button" type="submit">
            Save message draft
          </button>
        </form>
        <p className="provider-note">
          Drafts are saved here. Connect a messaging provider before enabling
          automatic delivery.
        </p>
      </section>
      <section className="message-history">
        <SectionHeading
          eyebrow="MESSAGE HISTORY"
          title="Everything said, in one place."
        />
        {data.messages.length ? (
          data.messages.map((message) => (
            <article key={message.id}>
              <span>{message.customerName || 'Studio message'}</span>
              <p>{message.body}</p>
              <small>
                {titleCase(message.channel)} · {titleCase(message.status)} ·{' '}
                {shortDate(message.createdAt.slice(0, 10))}
              </small>
            </article>
          ))
        ) : (
          <Empty
            title="No messages yet."
            text="Confirmations and prepared notes will collect here."
          />
        )}
      </section>
    </div>
  );
}

function Analytics({ data }: { data: StudioData }) {
  const serviceCounts = data.services.map((service) => ({
    name: service.name,
    count: data.appointments.filter(
      (item) => item.serviceId === service.id && item.status !== 'cancelled',
    ).length,
  }));
  const max = Math.max(1, ...serviceCounts.map((item) => item.count));
  const peak = Array.from({ length: 9 }, (_, index) => ({
    label: `${index + 9}:00`,
    count: data.appointments.filter(
      (item) => Number(item.startTime.slice(0, 2)) === index + 9,
    ).length,
  }));
  const peakMax = Math.max(1, ...peak.map((item) => item.count));
  return (
    <div className="studio-view">
      <section className="analytics-grid">
        <Metric
          label="Revenue"
          value={`SAR ${money(data.metrics.revenue)}`}
          detail="Recorded payments"
        />
        <Metric
          label="Bookings"
          value={String(data.appointments.length)}
          detail="All time"
        />
        <Metric
          label="Average value"
          value={`SAR ${money(data.metrics.averageBookingValue)}`}
          detail="Completed bookings"
        />
        <Metric
          label="New clients"
          value={String(data.metrics.newClients)}
          detail="This month"
        />
        <Metric
          label="Returning"
          value={String(data.metrics.returningClients)}
          detail="Clients"
        />
        <Metric
          label="Cancellations"
          value={`${data.metrics.cancellationRate}%`}
          detail="All bookings"
        />
      </section>
      <section className="chart-pair">
        <div>
          <SectionHeading
            eyebrow="POPULAR SERVICES"
            title="What they return for."
          />
          <div className="bar-chart">
            {serviceCounts.map((item) => (
              <div key={item.name}>
                <span>{item.name}</span>
                <i>
                  <b style={{ width: `${(item.count / max) * 100}%` }} />
                </i>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHeading
            eyebrow="PEAK BOOKING TIMES"
            title="The studio’s rhythm."
          />
          <div className="peak-chart">
            {peak.map((item) => (
              <div key={item.label}>
                <i>
                  <b
                    style={{
                      height: `${Math.max(4, (item.count / peakMax) * 100)}%`,
                    }}
                  />
                </i>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Settings({
  data,
  mutate,
}: {
  data: StudioData;
  mutate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [rules, setRules] = useState(data.availability);
  const [buffer, setBuffer] = useState(data.settings.bufferMinutes);
  const [dayOff, setDayOff] = useState('');
  const [reason, setReason] = useState('');
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  function updateRule(index: number, field: string, value: string | boolean) {
    setRules((current) =>
      current.map((rule, itemIndex) =>
        itemIndex === index ? { ...rule, [field]: value } : rule,
      ),
    );
  }
  return (
    <div className="studio-view settings-grid">
      <section>
        <SectionHeading eyebrow="AVAILABILITY" title="Your studio hours." />
        <div className="hours-list">
          {rules.map((rule, index) => (
            <article key={rule.id}>
              <label className="day-switch">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(event) =>
                    updateRule(index, 'enabled', event.target.checked)
                  }
                />
                <span>{days[rule.dayOfWeek]}</span>
              </label>
              <label>
                Open
                <input
                  type="time"
                  value={rule.startTime}
                  onChange={(event) =>
                    updateRule(index, 'startTime', event.target.value)
                  }
                  disabled={!rule.enabled}
                />
              </label>
              <label>
                Close
                <input
                  type="time"
                  value={rule.endTime}
                  onChange={(event) =>
                    updateRule(index, 'endTime', event.target.value)
                  }
                  disabled={!rule.enabled}
                />
              </label>
              <label>
                Break
                <input
                  type="time"
                  value={rule.breakStart || ''}
                  onChange={(event) =>
                    updateRule(index, 'breakStart', event.target.value)
                  }
                  disabled={!rule.enabled}
                />
              </label>
              <label>
                Return
                <input
                  type="time"
                  value={rule.breakEnd || ''}
                  onChange={(event) =>
                    updateRule(index, 'breakEnd', event.target.value)
                  }
                  disabled={!rule.enabled}
                />
              </label>
            </article>
          ))}
        </div>
        <label className="buffer-field">
          Buffer between appointments{' '}
          <input
            type="number"
            min="0"
            max="120"
            step="5"
            value={buffer}
            onChange={(event) => setBuffer(Number(event.target.value))}
          />
          <span>minutes</span>
        </label>
        <button
          className="wine-button"
          type="button"
          onClick={() =>
            void mutate({
              action: 'availability-save',
              rules,
              bufferMinutes: buffer,
            })
          }
        >
          Save availability
        </button>
      </section>
      <section>
        <SectionHeading eyebrow="DAYS OFF" title="Time to pause." />
        <form
          className="day-off-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await mutate({
              action: 'day-off-add',
              date: dayOff,
              reason,
            });
            if (ok) {
              setDayOff('');
              setReason('');
            }
          }}
        >
          <label>
            Date
            <input
              required
              type="date"
              value={dayOff}
              onChange={(event) => setDayOff(event.target.value)}
            />
          </label>
          <label>
            Note
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional"
            />
          </label>
          <button className="wine-button" type="submit">
            Add day off
          </button>
        </form>
        <div className="days-off-list">
          {data.daysOff.map((item) => (
            <article key={item.id}>
              <span>
                <strong>{formatDate(item.date)}</strong>
                <small>{item.reason || 'Studio closed'}</small>
              </span>
              <button
                type="button"
                onClick={() =>
                  void mutate({ action: 'day-off-remove', id: item.id })
                }
              >
                Remove
              </button>
            </article>
          ))}
        </div>
        <div className="settings-note">
          <p className="studio-kicker">DELIVERY CONNECTIONS</p>
          <h3>Messages are safely kept as drafts.</h3>
          <p>
            WhatsApp, SMS and email delivery need a provider account and
            credentials. Nothing is falsely marked as sent.
          </p>
        </div>
      </section>
    </div>
  );
}

function AppointmentSheet({
  appointment,
  close,
  mutate,
}: {
  appointment: Appointment;
  close: () => void;
  mutate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [note, setNote] = useState(appointment.internalNotes || '');
  return (
    <div
      className="studio-overlay"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <dialog
        open
        className="studio-sheet"
        aria-labelledby="appointment-sheet-title"
      >
        <button
          className="sheet-close"
          type="button"
          onClick={close}
          aria-label="Close"
        >
          <X aria-hidden="true" size={18} />
        </button>
        <p className="studio-kicker">SOLÉA.Co MOMENT</p>
        <h2 id="appointment-sheet-title">{appointment.customerName}</h2>
        <p className="sheet-subtitle">{appointment.serviceName}</p>
        <dl>
          <div>
            <dt>Date</dt>
            <dd>{formatDate(appointment.appointmentDate)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{displayTime(appointment.startTime)}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>{appointment.customerPhone}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <Status value={appointment.status} />
            </dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>
              {appointment.quotedPriceSar === null
                ? 'Not set'
                : `SAR ${money(appointment.quotedPriceSar)}`}
            </dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>
              {appointment.paymentStatus === 'paid'
                ? `Recorded · SAR ${money(appointment.recordedPaymentSar || 0)}`
                : 'Not recorded'}
            </dd>
          </div>
        </dl>
        <label className="sheet-note">
          Private note
          <textarea
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <button
          className="wine-button"
          type="button"
          onClick={() =>
            void mutate({
              action: 'appointment-note',
              id: appointment.id,
              body: note,
            })
          }
        >
          Save note
        </button>
        <div className="sheet-actions">
          {appointment.paymentStatus === 'paid' ? (
            <button
              type="button"
              onClick={() =>
                void mutate({
                  action: 'payment-remove',
                  appointmentId: appointment.id,
                })
              }
            >
              Remove recorded payment
            </button>
          ) : (
            <button
              type="button"
              disabled={appointment.quotedPriceSar === null}
              onClick={() =>
                void mutate({
                  action: 'payment-record',
                  appointmentId: appointment.id,
                })
              }
            >
              Record payment
              {appointment.quotedPriceSar === null
                ? ' · price not set'
                : ` · SAR ${money(appointment.quotedPriceSar)}`}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              void mutate({
                action: 'appointment-status',
                id: appointment.id,
                status: 'confirmed',
              })
            }
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() =>
              void mutate({
                action: 'appointment-status',
                id: appointment.id,
                status: 'completed',
              })
            }
          >
            Mark completed
          </button>
          <button
            type="button"
            onClick={() =>
              void mutate({
                action: 'appointment-status',
                id: appointment.id,
                status: 'no-show',
              })
            }
          >
            No-show
          </button>
          <button
            className="danger-link"
            type="button"
            onClick={() =>
              void mutate({
                action: 'appointment-status',
                id: appointment.id,
                status: 'cancelled',
              })
            }
          >
            Cancel appointment
          </button>
        </div>
      </dialog>
    </div>
  );
}

function ClientSheet({
  client,
  appointments,
  close,
  mutate,
}: {
  client: Client;
  appointments: Appointment[];
  close: () => void;
  mutate: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [shape, setShape] = useState(client.preferredShape || '');
  const [colors, setColors] = useState(client.preferredColors || '');
  const [style, setStyle] = useState(client.appointmentStyle || '');
  const [note, setNote] = useState('');
  return (
    <div
      className="studio-overlay"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <dialog
        open
        className="studio-sheet client-sheet"
        aria-labelledby="client-sheet-title"
      >
        <button className="sheet-close" type="button" onClick={close}>
          <X aria-hidden="true" size={18} />
        </button>
        <p className="studio-kicker">HER SOLÉA.Co MOMENTS</p>
        <h2 id="client-sheet-title">{client.fullName}</h2>
        <div className="client-stats">
          <span>
            <strong>{client.totalVisits}</strong> visits
          </span>
          <span>
            <strong>SAR {money(client.totalSpend)}</strong> spent
          </span>
          <span>
            <strong>
              {client.lastVisit ? shortDate(client.lastVisit) : '—'}
            </strong>{' '}
            last visit
          </span>
        </div>
        <section>
          <h3>Preferences</h3>
          <div className="preference-form">
            <label>
              Preferred shape
              <input
                value={shape}
                onChange={(event) => setShape(event.target.value)}
                placeholder="e.g. Almond"
              />
            </label>
            <label>
              Preferred colours
              <input
                value={colors}
                onChange={(event) => setColors(event.target.value)}
                placeholder="e.g. Burgundy / Nude"
              />
            </label>
            <label>
              Appointment style
              <input
                value={style}
                onChange={(event) => setStyle(event.target.value)}
                placeholder="e.g. Prefers quiet appointments"
              />
            </label>
            <button
              className="wine-button"
              type="button"
              onClick={() =>
                void mutate({
                  action: 'client-preferences',
                  customerId: client.id,
                  preferredShape: shape,
                  preferredColors: colors,
                  appointmentStyle: style,
                })
              }
            >
              Save preferences
            </button>
          </div>
        </section>
        <section>
          <h3>Appointment history</h3>
          <div className="history-list">
            {appointments.map((item) => (
              <article key={item.id}>
                <time>{shortDate(item.appointmentDate)}</time>
                <span>
                  <strong>{item.serviceName}</strong>
                  <small>{displayTime(item.startTime)}</small>
                </span>
                <Status value={item.status} />
              </article>
            ))}
          </div>
        </section>
        <section>
          <h3>Private notes</h3>
          {client.notes.map((item) => (
            <p className="saved-note" key={item.id}>
              {item.body}
              <small>{shortDate(item.createdAt.slice(0, 10))}</small>
            </p>
          ))}
          <div className="add-note">
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add something thoughtful to remember…"
            />
            <button
              className="wine-button"
              type="button"
              onClick={async () => {
                const ok = await mutate({
                  action: 'client-note',
                  customerId: client.id,
                  body: note,
                });
                if (ok) setNote('');
              }}
            >
              Add note
            </button>
          </div>
        </section>
      </dialog>
    </div>
  );
}

function ServiceEditor({
  service,
  close,
  save,
}: {
  service: Service | null;
  close: () => void;
  save: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    durationMinutes: service?.durationMinutes || 45,
    priceSar: service?.priceSar?.toString() || '',
    status: service?.status || 'active',
  });
  return (
    <div className="studio-overlay">
      <form
        className="studio-sheet service-editor"
        onSubmit={async (event) => {
          event.preventDefault();
          const ok = await save({
            action: 'service-save',
            id: service?.id,
            slug: service?.slug,
            sortOrder: service?.sortOrder,
            availability: service?.availability,
            ...form,
          });
          if (ok) close();
        }}
      >
        <button className="sheet-close" type="button" onClick={close}>
          <X aria-hidden="true" size={18} />
        </button>
        <p className="studio-kicker">SERVICE DETAILS</p>
        <h2>{service ? 'Refine the service.' : 'Add a new ritual.'}</h2>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </label>
        <label>
          Duration, minutes
          <input
            required
            type="number"
            min="15"
            max="360"
            step="5"
            value={form.durationMinutes}
            onChange={(event) =>
              setForm({ ...form, durationMinutes: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Price, SAR
          <input
            type="number"
            min="0"
            step="1"
            value={form.priceSar}
            onChange={(event) =>
              setForm({ ...form, priceSar: event.target.value })
            }
            placeholder="Leave blank until confirmed"
          />
        </label>
        <label>
          Status
          <select
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value })
            }
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button className="wine-button" type="submit">
          Save service
        </button>
        {service && (
          <button
            className="danger-link"
            type="button"
            onClick={async () => {
              const ok = await save({
                action: 'service-archive',
                id: service.id,
              });
              if (ok) close();
            }}
          >
            Archive service
          </button>
        )}
      </form>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="studio-section-heading">
      <div>
        <p className="studio-kicker">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="studio-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{titleCase(value)}</span>;
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="studio-empty">
      <span>S</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function titleFor(view: View) {
  const titles: Record<View, React.ReactNode> = {
    overview: 'Overview',
    appointments: (
      <>
        Every <em>moment.</em>
      </>
    ),
    clients: (
      <>
        The client <em>book.</em>
      </>
    ),
    services: (
      <>
        Signature <em>services.</em>
      </>
    ),
    calendar: (
      <>
        The studio <em>diary.</em>
      </>
    ),
    messages: (
      <>
        Words with <em>care.</em>
      </>
    ),
    analytics: (
      <>
        A beautiful <em>view.</em>
      </>
    ),
    settings: (
      <>
        Everything in <em>place.</em>
      </>
    ),
  };
  return titles[view];
}
function titleCase(value: string) {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
function money(value: number) {
  return new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(
    value || 0,
  );
}
function displayTime(value: string) {
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
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}
function shortDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`));
}
function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function calendarDays(cursor: Date, mode: 'day' | 'week' | 'month') {
  const start = new Date(cursor);
  if (mode === 'week') start.setDate(start.getDate() - start.getDay());
  if (mode === 'month') {
    start.setDate(1);
    start.setDate(start.getDate() - start.getDay());
  }
  const count = mode === 'day' ? 1 : mode === 'week' ? 7 : 42;
  const activeMonth = cursor.getMonth();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      value: localDate(date),
      weekday: new Intl.DateTimeFormat('en', { weekday: 'short' })
        .format(date)
        .toUpperCase(),
      day: String(date.getDate()).padStart(2, '0'),
      month: new Intl.DateTimeFormat('en', { month: 'short' })
        .format(date)
        .toUpperCase(),
      inMonth: mode !== 'month' || date.getMonth() === activeMonth,
    };
  });
}

function moveCalendar(
  cursor: Date,
  mode: 'day' | 'week' | 'month',
  direction: number,
) {
  const next = new Date(cursor);
  if (mode === 'month') next.setMonth(next.getMonth() + direction);
  else next.setDate(next.getDate() + direction * (mode === 'week' ? 7 : 1));
  return next;
}

function calendarLabel(
  cursor: Date,
  mode: 'day' | 'week' | 'month',
  days: ReturnType<typeof calendarDays>,
) {
  if (mode === 'day') return formatDate(days[0].value);
  if (mode === 'week')
    return `${shortDate(days[0].value)} — ${shortDate(days[6].value)}`;
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(cursor);
}
