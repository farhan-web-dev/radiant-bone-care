export function getAppUrl(): string {
  return import.meta.env.VITE_APP_URL || "http://localhost:5173";
}

export function getClinicPaymentLink(): string {
  return import.meta.env.VITE_CLINIC_PAYMENT_LINK ?? "";
}

export function getOnlineConsultationPaymentLink(): string {
  return import.meta.env.VITE_ONLINE_CONSULTATION_PAYMENT_LINK ?? "";
}

export function buildStripePaymentUrl(
  baseLink: string,
  params: Record<string, string>,
): string {
  if (!baseLink) return "";

  const url = new URL(baseLink);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function getBookingSuccessUrl(reference?: string): string {
  const url = new URL("/booking/success", getAppUrl());
  if (reference) url.searchParams.set("ref", reference);
  return url.toString();
}

export function getBookingCancelUrl(): string {
  return new URL("/booking/cancel", getAppUrl()).toString();
}
