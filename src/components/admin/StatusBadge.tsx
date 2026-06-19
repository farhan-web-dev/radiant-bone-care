import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BookingStatus, PaymentStatus } from "@/lib/database.types";

const bookingStyles: Record<BookingStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
  completed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
};

const paymentStyles: Record<PaymentStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  paid: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  refunded: "bg-slate-500/15 text-slate-700 border-slate-500/30",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", bookingStyles[status])}>
      {status}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", paymentStyles[status])}>
      {status}
    </Badge>
  );
}
