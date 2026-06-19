import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  Appointment,
  BookingStatus,
  BookingType,
  Patient,
  Payment,
  PaymentStatus,
} from "@/lib/database.types";
import { checkSlotAvailable } from "@/lib/booking-api";
import { todayIsoDate } from "@/lib/admin-format";

export class AdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminError";
  }
}

function assertConfigured() {
  if (!isSupabaseConfigured()) {
    throw new AdminError("Supabase is not configured.");
  }
}

export interface AppointmentFilters {
  search?: string;
  date?: string;
  bookingType?: BookingType | "all";
  paymentStatus?: PaymentStatus | "all";
  bookingStatus?: BookingStatus | "all";
}

export interface PaymentFilters {
  search?: string;
  paymentStatus?: PaymentStatus | "all";
}

export interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  clinicAppointments: number;
  onlineConsultations: number;
  paidBookings: number;
  pendingPayments: number;
  appointmentsByDay: { date: string; count: number }[];
  bookingsByType: { type: string; count: number }[];
}

export async function fetchAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
  assertConfigured();

  let query = supabase
    .from("appointments")
    .select("*")
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  if (filters.date) query = query.eq("appointment_date", filters.date);
  if (filters.bookingType && filters.bookingType !== "all") {
    query = query.eq("booking_type", filters.bookingType);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }
  if (filters.bookingStatus && filters.bookingStatus !== "all") {
    query = query.eq("booking_status", filters.bookingStatus);
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `full_name.ilike.${term},email.ilike.${term},phone.ilike.${term},service.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new AdminError(error.message);
  return data ?? [];
}

export async function updateAppointmentStatus(id: string, bookingStatus: BookingStatus) {
  assertConfigured();
  const { data, error } = await supabase
    .from("appointments")
    .update({ booking_status: bookingStatus })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AdminError(error.message);
  return data;
}

export async function rescheduleAppointment(
  id: string,
  appointmentDate: string,
  appointmentTime: string,
) {
  assertConfigured();

  const { data: current, error: fetchError } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !current) throw new AdminError(fetchError?.message ?? "Appointment not found.");

  const sameSlot =
    current.appointment_date === appointmentDate &&
    current.appointment_time === appointmentTime.slice(0, 8);

  if (!sameSlot) {
    const available = await checkSlotAvailable(appointmentDate, appointmentTime);
    if (!available) throw new AdminError("This appointment slot is already booked.");
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new AdminError("This appointment slot is already booked.");
    throw new AdminError(error.message);
  }

  return data;
}

export async function fetchPatients(search?: string): Promise<Patient[]> {
  assertConfigured();

  let query = supabase.from("patients").select("*").order("updated_at", { ascending: false });

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new AdminError(error.message);
  return data ?? [];
}

export async function fetchPatientAppointments(patientId: string): Promise<Appointment[]> {
  assertConfigured();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patientId)
    .order("appointment_date", { ascending: false });

  if (error) throw new AdminError(error.message);
  return data ?? [];
}

export async function fetchPatientPayments(patientId: string): Promise<Payment[]> {
  assertConfigured();
  const appointments = await fetchPatientAppointments(patientId);
  const ids = appointments.map((a) => a.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .in("appointment_id", ids)
    .order("created_at", { ascending: false });

  if (error) throw new AdminError(error.message);
  return data ?? [];
}

export async function fetchPayments(filters: PaymentFilters = {}): Promise<
  (Payment & { appointment?: Appointment | null })[]
> {
  assertConfigured();

  let query = supabase
    .from("payments")
    .select("*, appointments(*)")
    .order("created_at", { ascending: false });

  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  const { data, error } = await query;
  if (error) throw new AdminError(error.message);

  let rows = (data ?? []) as (Payment & { appointments: Appointment | null })[];

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter((row) => {
      const appt = row.appointments;
      return (
        row.stripe_reference?.toLowerCase().includes(term) ||
        appt?.full_name.toLowerCase().includes(term) ||
        appt?.email.toLowerCase().includes(term) ||
        appt?.phone.includes(term)
      );
    });
  }

  return rows.map(({ appointments, ...payment }) => ({
    ...payment,
    appointment: appointments,
  }));
}

export async function updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
  assertConfigured();
  const { data, error } = await supabase
    .from("payments")
    .update({ payment_status: paymentStatus })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new AdminError(error.message);

  if (paymentStatus === "refunded" && data) {
    await supabase
      .from("appointments")
      .update({ payment_status: "refunded" })
      .eq("id", data.appointment_id);
  }

  return data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  assertConfigured();
  const today = todayIsoDate();

  const { data: appointments, error } = await supabase.from("appointments").select("*");
  if (error) throw new AdminError(error.message);

  const rows = appointments ?? [];
  const active = rows.filter((a) => a.booking_status !== "cancelled");

  const dayMap = new Map<string, number>();
  for (const row of active) {
    dayMap.set(row.appointment_date, (dayMap.get(row.appointment_date) ?? 0) + 1);
  }

  const appointmentsByDay = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, count]) => ({ date, count }));

  return {
    totalAppointments: active.length,
    todayAppointments: active.filter((a) => a.appointment_date === today).length,
    clinicAppointments: active.filter((a) => a.booking_type === "clinic").length,
    onlineConsultations: active.filter((a) => a.booking_type === "online").length,
    paidBookings: active.filter((a) => a.payment_status === "paid").length,
    pendingPayments: active.filter((a) => a.payment_status === "pending").length,
    appointmentsByDay,
    bookingsByType: [
      { type: "Clinic", count: active.filter((a) => a.booking_type === "clinic").length },
      { type: "Online", count: active.filter((a) => a.booking_type === "online").length },
    ],
  };
}
