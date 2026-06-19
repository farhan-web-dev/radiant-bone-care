import { format, parseISO } from "date-fns";
import type { BookingStatus, BookingType, PaymentMethod, PaymentStatus } from "@/lib/database.types";

export function formatDate(value: string) {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function formatDateTime(value: string) {
  try {
    return format(parseISO(value), "MMM d, yyyy h:mm a");
  } catch {
    return value;
  }
}

export function formatTime(value: string) {
  const [h, m] = value.split(":");
  const hour = Number(h);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${period}`;
}

export function labelBookingType(type: BookingType) {
  return type === "clinic" ? "Clinic" : "Online";
}

export function labelBookingStatus(status: BookingStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function labelPaymentStatus(status: PaymentStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function labelPaymentMethod(method: PaymentMethod | null) {
  if (!method) return "—";
  return method === "clinic" ? "Pay at clinic" : "Stripe";
}

export function todayIsoDate() {
  return format(new Date(), "yyyy-MM-dd");
}
