export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceSar: number | null;
  availability: string;
  status: string;
  sortOrder: number;
};

export type Appointment = {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  quotedPriceSar: number | null;
  recordedPaymentSar: number | null;
  paymentStatus: string | null;
  status: string;
  customerNotes: string | null;
  internalNotes: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  preferredContact: string;
  serviceId: string;
  serviceName: string;
};

export type Client = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  preferredContact: string;
  createdAt: string;
  totalVisits: number;
  lastVisit: string | null;
  nextAppointment: string | null;
  totalSpend: number;
  preferredShape: string | null;
  preferredColors: string | null;
  appointmentStyle: string | null;
  notes: Array<{ id: string; body: string; createdAt: string }>;
};

export type StudioData = {
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  messages: Array<{
    id: string;
    customerName: string | null;
    kind: string;
    channel: string;
    body: string;
    status: string;
    scheduledFor: string | null;
    createdAt: string;
  }>;
  availability: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
    enabled: boolean;
  }>;
  daysOff: Array<{ id: string; date: string; reason: string | null }>;
  settings: { bufferMinutes: number; timezone: string };
  metrics: {
    todayAppointments: number;
    upcomingAppointments: number;
    newClients: number;
    revenue: number;
    cancellationRate: number;
    attendanceRate: number;
    averageBookingValue: number;
    returningClients: number;
  };
};
