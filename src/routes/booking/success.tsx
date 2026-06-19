import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BookingError,
  clearBookingSession,
  confirmAppointmentPayment,
  confirmPendingBooking,
  readBookingSession,
} from "@/lib/booking-api";

export const Route = createFileRoute("/booking/success")({
  component: BookingSuccessPage,
});

function isAlreadyConfirmedError(error: unknown): boolean {
  if (!(error instanceof BookingError)) return false;
  return (
    error.code === "P0002" ||
    error.message.toLowerCase().includes("not found") ||
    error.message.toLowerCase().includes("expired")
  );
}

function BookingSuccessPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finalize() {
      try {
        const params = new URLSearchParams(window.location.search);
        const stripeRef =
          params.get("session_id") ??
          params.get("payment_intent") ??
          params.get("reference") ??
          undefined;

        const session = readBookingSession();
        if (!session.flow || !session.refId) {
          throw new Error(
            "Booking session expired. If payment succeeded, your confirmation email will arrive shortly.",
          );
        }

        try {
          if (session.flow === "clinic_online") {
            await confirmAppointmentPayment(session.refId, stripeRef);
          } else if (session.flow === "online_consultation") {
            await confirmPendingBooking(session.refId, stripeRef);
          } else {
            throw new Error("Unknown booking flow.");
          }
        } catch (confirmError) {
          // Webhook may have already confirmed the booking before redirect
          if (!isAlreadyConfirmedError(confirmError)) {
            throw confirmError;
          }
        }

        if (cancelled) return;
        setDetails(session.details);
        setStatus("success");
        clearBookingSession();
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Failed to confirm your booking.",
        );
      }
    }

    finalize();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full glass-strong rounded-3xl p-8 shadow-elegant text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Confirming your booking…</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we verify your payment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-14 h-14 text-accent mx-auto mb-4" />
            <h1 className="text-2xl font-display font-semibold">Booking Confirmed</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your appointment is confirmed and payment was received.
            </p>
            {details && (
              <div className="mt-6 text-left space-y-2 text-sm border border-border rounded-2xl p-4 bg-muted/30">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Patient</span>
                  <span className="font-medium">{details.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{details.date}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{details.time}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{details.bookingType}</span>
                </div>
              </div>
            )}
            <Button asChild className="w-full mt-6 rounded-full">
              <Link to="/">Return to Home</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Confirmation Issue</h1>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
            <Button asChild variant="outline" className="w-full mt-6 rounded-full">
              <Link to="/">Return to Home</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
