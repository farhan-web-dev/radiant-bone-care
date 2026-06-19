import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { APPOINTMENT_TIME_SLOTS } from "@/lib/appointment-slots";
import {
  fetchAppointments,
  rescheduleAppointment,
  updateAppointmentStatus,
  type AppointmentFilters,
} from "@/lib/admin-api";
import {
  formatDate,
  formatTime,
  labelBookingType,
  labelPaymentMethod,
} from "@/lib/admin-format";
import type { Appointment } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/appointments")({
  component: AdminAppointmentsPage,
});

function AdminAppointmentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [bookingType, setBookingType] = useState<AppointmentFilters["bookingType"]>("all");
  const [paymentStatus, setPaymentStatus] = useState<AppointmentFilters["paymentStatus"]>("all");
  const [bookingStatus, setBookingStatus] = useState<AppointmentFilters["bookingStatus"]>("all");
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const filters = useMemo(
    () => ({ search, date, bookingType, paymentStatus, bookingStatus }),
    [search, date, bookingType, paymentStatus, bookingStatus],
  );

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin", "appointments", filters],
    queryFn: () => fetchAppointments(filters),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Appointment["booking_status"] }) =>
      updateAppointmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Appointment updated.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed."),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      if (!rescheduleTarget) throw new Error("No appointment selected.");
      return rescheduleAppointment(rescheduleTarget.id, newDate, newTime);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Appointment rescheduled.");
      setRescheduleTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Reschedule failed."),
  });

  function openReschedule(appointment: Appointment) {
    setRescheduleTarget(appointment);
    setNewDate(appointment.appointment_date);
    setNewTime(appointment.appointment_time.slice(0, 5));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-sm text-muted-foreground">Manage, reschedule, and update appointment status.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Input placeholder="Search name, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select value={bookingType} onValueChange={(v) => setBookingType(v as AppointmentFilters["bookingType"])}>
          <SelectTrigger><SelectValue placeholder="Booking type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="clinic">Clinic</SelectItem>
            <SelectItem value="online">Online</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as AppointmentFilters["paymentStatus"])}>
          <SelectTrigger><SelectValue placeholder="Payment status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bookingStatus} onValueChange={(v) => setBookingStatus(v as AppointmentFilters["bookingStatus"])}>
          <SelectTrigger><SelectValue placeholder="Booking status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading appointments…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load."}</p>
      ) : (
        <div className="rounded-xl border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <div className="font-medium">{appointment.full_name}</div>
                      <div className="text-xs text-muted-foreground">{appointment.email}</div>
                      <div className="text-xs text-muted-foreground">{appointment.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(appointment.appointment_date)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(appointment.appointment_time.slice(0, 5))}
                      </div>
                    </TableCell>
                    <TableCell>{labelBookingType(appointment.booking_type)}</TableCell>
                    <TableCell><BookingStatusBadge status={appointment.booking_status} /></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <PaymentStatusBadge status={appointment.payment_status} />
                        <div className="text-xs text-muted-foreground">
                          {labelPaymentMethod(appointment.payment_method)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openReschedule(appointment)}>
                          Reschedule
                        </Button>
                        {appointment.booking_status !== "completed" && appointment.booking_status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => statusMutation.mutate({ id: appointment.id, status: "completed" })}
                          >
                            Complete
                          </Button>
                        )}
                        {appointment.booking_status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => statusMutation.mutate({ id: appointment.id, status: "cancelled" })}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-date">New date</Label>
              <Input id="new-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-time">New time</Label>
              <Select value={newTime} onValueChange={setNewTime}>
                <SelectTrigger id="new-time"><SelectValue placeholder="Select time" /></SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>{formatTime(slot)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>Close</Button>
            <Button
              onClick={() => rescheduleMutation.mutate()}
              disabled={!newDate || !newTime || rescheduleMutation.isPending}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
