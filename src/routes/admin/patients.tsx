import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/admin/StatusBadge";
import {
  fetchPatientAppointments,
  fetchPatientPayments,
  fetchPatients,
} from "@/lib/admin-api";
import {
  formatDate,
  formatDateTime,
  formatTime,
  labelBookingType,
  labelPaymentMethod,
} from "@/lib/admin-format";
import type { Patient } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/patients")({
  component: AdminPatientsPage,
});

function PatientDetails({ patient }: { patient: Patient }) {
  const appointmentsQuery = useQuery({
    queryKey: ["admin", "patient", patient.id, "appointments"],
    queryFn: () => fetchPatientAppointments(patient.id),
  });

  const paymentsQuery = useQuery({
    queryKey: ["admin", "patient", patient.id, "payments"],
    queryFn: () => fetchPatientPayments(patient.id),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2 p-4 bg-muted/30">
      <div>
        <h3 className="text-sm font-semibold mb-2">Appointment history</h3>
        {appointmentsQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (appointmentsQuery.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">No appointments.</p>
        ) : (
          <div className="space-y-2">
            {appointmentsQuery.data?.map((appt) => (
              <div key={appt.id} className="rounded-lg border bg-background p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>{formatDate(appt.appointment_date)} · {formatTime(appt.appointment_time.slice(0, 5))}</span>
                  <BookingStatusBadge status={appt.booking_status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {labelBookingType(appt.booking_type)} · {appt.service ?? "General"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Payment history</h3>
        {paymentsQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (paymentsQuery.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">No payments.</p>
        ) : (
          <div className="space-y-2">
            {paymentsQuery.data?.map((payment) => (
              <div key={payment.id} className="rounded-lg border bg-background p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>{formatDateTime(payment.created_at)}</span>
                  <PaymentStatusBadge status={payment.payment_status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {labelPaymentMethod(payment.payment_method)}
                  {payment.amount != null ? ` · PKR ${payment.amount.toLocaleString()}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPatientsPage() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin", "patients", search],
    queryFn: () => fetchPatients(search),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <p className="text-sm text-muted-foreground">
          Patient records are generated automatically from bookings.
        </p>
      </div>

      <Input
        className="max-w-md"
        placeholder="Search patients…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading patients…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load."}</p>
      ) : (
        <div className="rounded-xl border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No patients found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((patient) => (
                  <Fragment key={patient.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setExpandedId((current) => (current === patient.id ? null : patient.id))
                          }
                        >
                          {expandedId === patient.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{patient.full_name}</TableCell>
                      <TableCell>{patient.email}</TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>{formatDate(patient.created_at.slice(0, 10))}</TableCell>
                    </TableRow>
                    {expandedId === patient.id && (
                      <TableRow>
                        <TableCell colSpan={5} className="p-0">
                          <PatientDetails patient={patient} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
