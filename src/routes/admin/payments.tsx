import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { fetchPayments, updatePaymentStatus, type PaymentFilters } from "@/lib/admin-api";
import {
  formatDateTime,
  labelPaymentMethod,
} from "@/lib/admin-format";
import { downloadCsv } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/admin/payments")({
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilters["paymentStatus"]>("all");

  const filters = useMemo(() => ({ search, paymentStatus }), [search, paymentStatus]);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin", "payments", filters],
    queryFn: () => fetchPayments(filters),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => updatePaymentStatus(id, "refunded"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Payment marked as refunded.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "paid" | "rejected" }) =>
      updatePaymentStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success(variables.status === "paid" ? "Payment approved." : "Payment rejected.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed."),
  });

  function handleExport() {
    if (data.length === 0) {
      toast.error("No payments to export.");
      return;
    }

    downloadCsv(
      `payments-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Patient", "Email", "Amount", "Method", "Status", "Stripe Reference"],
      data.map((payment) => [
        formatDateTime(payment.created_at),
        payment.appointment?.full_name ?? "",
        payment.appointment?.email ?? "",
        payment.amount?.toString() ?? "",
        labelPaymentMethod(payment.payment_method),
        payment.payment_status,
        payment.stripe_reference ?? "",
      ]),
    );
    toast.success("Payment report downloaded.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">Track paid, pending, and refunded payments.</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export report
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 max-w-2xl">
        <Input placeholder="Search patient or reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentFilters["paymentStatus"])}>
          <SelectTrigger><SelectValue placeholder="Payment status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="pending_verification">Pending Verification</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading payments…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Failed to load."}</p>
      ) : (
        <div className="rounded-xl border bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference/Txn ID</TableHead>
                <TableHead>Screenshot</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDateTime(payment.created_at)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{payment.appointment?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{payment.appointment?.email}</div>
                    </TableCell>
                    <TableCell>
                      {payment.amount != null ? `PKR ${payment.amount.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>{labelPaymentMethod(payment.payment_method)}</TableCell>
                    <TableCell><PaymentStatusBadge status={payment.payment_status} /></TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">
                      {payment.transaction_id || payment.stripe_reference || "—"}
                    </TableCell>
                    <TableCell>
                      {payment.payment_screenshot_url ? (
                        <a href={payment.payment_screenshot_url} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                          View
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {payment.payment_status === "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refundMutation.mutate(payment.id)}
                        >
                          Mark refunded
                        </Button>
                      )}
                      {payment.payment_status === "pending_verification" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200"
                            onClick={() => statusMutation.mutate({ id: payment.id, status: "paid" })}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200"
                            onClick={() => statusMutation.mutate({ id: payment.id, status: "rejected" })}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
