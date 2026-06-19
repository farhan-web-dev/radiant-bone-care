import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearBookingSession } from "@/lib/booking-api";

export const Route = createFileRoute("/booking/cancel")({
  component: BookingCancelPage,
});

function BookingCancelPage() {
  useEffect(() => {
    clearBookingSession();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full glass-strong rounded-3xl p-8 shadow-elegant text-center">
        <XCircle className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-display font-semibold">Payment Cancelled</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your payment was not completed. No appointment has been confirmed. You can try booking again.
        </p>
        <Button asChild className="w-full mt-6 rounded-full">
          <Link to="/" hash="appointment">
            Try Again
          </Link>
        </Button>
      </div>
    </div>
  );
}
