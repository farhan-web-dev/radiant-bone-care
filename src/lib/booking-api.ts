import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PendingBookingPayload } from "@/lib/database.types";

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export async function checkSlotAvailable(
  appointmentDate: string,
  appointmentTime: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Booking system is not configured.");
  }

  const { data, error } = await supabase.rpc("is_slot_available", {
    p_date: appointmentDate,
    p_time: appointmentTime,
  });

  if (error) {
    throw new BookingError(error.message, error.code);
  }

  return Boolean(data);
}

export async function createClinicAppointment(input: {
  fullName: string;
  email: string;
  phone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
  service?: string;
}): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Booking system is not configured.");
  }

  const { data, error } = await supabase.rpc("create_clinic_appointment", {
    p_full_name: input.fullName,
    p_email: input.email,
    p_phone: input.phone,
    p_appointment_date: input.appointmentDate,
    p_appointment_time: input.appointmentTime,
    p_notes: input.notes ?? null,
    p_service: input.service ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      throw new BookingError("This appointment slot is already booked.", error.code);
    }
    throw new BookingError(error.message, error.code);
  }

  return data as string;
}

export async function createPendingBooking(
  payload: PendingBookingPayload,
): Promise<{ id: string; sessionToken: string }> {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Booking system is not configured.");
  }

  const { data, error } = await supabase.rpc("create_pending_booking", {
    p_payload: payload,
  });

  if (error) {
    if (error.code === "23505") {
      throw new BookingError("This appointment slot is already booked.", error.code);
    }
    throw new BookingError(error.message, error.code);
  }

  const row = data?.[0];
  if (!row) {
    throw new BookingError("Failed to create pending booking.");
  }

  return { id: row.id, sessionToken: row.session_token };
}

export async function createClinicAppointmentPayOnline(input: {
  fullName: string;
  email: string;
  phone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
  service?: string;
}): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Booking system is not configured.");
  }

  const { data, error } = await supabase.rpc("create_clinic_appointment_pay_online", {
    p_full_name: input.fullName,
    p_email: input.email,
    p_phone: input.phone,
    p_appointment_date: input.appointmentDate,
    p_appointment_time: input.appointmentTime,
    p_notes: input.notes ?? null,
    p_service: input.service ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      throw new BookingError("This appointment slot is already booked.", error.code);
    }
    throw new BookingError(error.message, error.code);
  }

  return data as string;
}

export async function confirmAppointmentPayment(
  appointmentId: string,
  stripeReference?: string,
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Booking system is not configured.");
  }

  const { data, error } = await supabase.rpc("confirm_appointment_payment", {
    p_appointment_id: appointmentId,
    p_stripe_reference: stripeReference ?? null,
    p_amount: null,
  });

  if (error) {
    throw new BookingError(error.message, error.code);
  }

  return data as string;
}

export async function confirmPendingBooking(
  pendingId: string,
  stripeReference?: string,
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Booking system is not configured.");
  }

  const { data, error } = await supabase.rpc("confirm_pending_booking", {
    p_pending_id: pendingId,
    p_stripe_reference: stripeReference ?? null,
    p_amount: null,
    p_ignore_expiry: false,
  });

  if (error) {
    if (error.code === "23505") {
      throw new BookingError("This appointment slot is already booked.", error.code);
    }
    throw new BookingError(error.message, error.code);
  }

  return data as string;
}

export async function getAppointmentById(appointmentId: string) {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Booking system is not configured.");
  }

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) throw new BookingError(error.message, error.code);
  return data;
}

export async function uploadPaymentScreenshot(file: File): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Booking system is not configured.");
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `screenshots/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("payment_screenshots")
    .upload(filePath, file);

  if (uploadError) {
    throw new BookingError("Failed to upload screenshot: " + uploadError.message);
  }

  const { data } = supabase.storage
    .from("payment_screenshots")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function createManualPaymentAppointment(input: {
  fullName: string;
  email: string;
  phone: string;
  appointmentDate: string;
  appointmentTime: string;
  paymentMethod: "easypaisa" | "jazzcash";
  transactionId: string;
  paymentScreenshotUrl?: string;
  notes?: string;
  service?: string;
  bookingType?: "clinic" | "online";
}): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Booking system is not configured.");
  }

  const { data, error } = await supabase.rpc("create_manual_payment_appointment", {
    p_full_name: input.fullName,
    p_email: input.email,
    p_phone: input.phone,
    p_appointment_date: input.appointmentDate,
    p_appointment_time: input.appointmentTime,
    p_payment_method: input.paymentMethod,
    p_transaction_id: input.transactionId,
    p_payment_screenshot_url: input.paymentScreenshotUrl ?? null,
    p_notes: input.notes ?? null,
    p_service: input.service ?? null,
    p_booking_type: input.bookingType ?? "clinic",
  });

  if (error) {
    if (error.code === "23505") {
      throw new BookingError("This appointment slot is already booked.", error.code);
    }
    throw new BookingError(error.message, error.code);
  }

  return data as string;
}

export const BOOKING_SESSION_KEYS = {
  flow: "radiant_booking_flow",
  refId: "radiant_booking_ref",
  details: "radiant_booking_details",
} as const;

export type BookingFlow = "clinic_online" | "online_consultation";

export function storeBookingSession(
  flow: BookingFlow,
  refId: string,
  details: Record<string, string>,
) {
  sessionStorage.setItem(BOOKING_SESSION_KEYS.flow, flow);
  sessionStorage.setItem(BOOKING_SESSION_KEYS.refId, refId);
  sessionStorage.setItem(BOOKING_SESSION_KEYS.details, JSON.stringify(details));
}

export function readBookingSession() {
  const flow = sessionStorage.getItem(BOOKING_SESSION_KEYS.flow) as BookingFlow | null;
  const refId = sessionStorage.getItem(BOOKING_SESSION_KEYS.refId);
  const detailsRaw = sessionStorage.getItem(BOOKING_SESSION_KEYS.details);
  const details = detailsRaw ? (JSON.parse(detailsRaw) as Record<string, string>) : null;
  return { flow, refId, details };
}

export function clearBookingSession() {
  sessionStorage.removeItem(BOOKING_SESSION_KEYS.flow);
  sessionStorage.removeItem(BOOKING_SESSION_KEYS.refId);
  sessionStorage.removeItem(BOOKING_SESSION_KEYS.details);
}

export async function getAdminSession() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInAdmin(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    throw new BookingError("Admin authentication is not configured.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export { verifyAdminAccess, isCurrentUserAdmin } from "@/lib/admin-auth";
export type { AdminAccessResult } from "@/lib/admin-auth";
