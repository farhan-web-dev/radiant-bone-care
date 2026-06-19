import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Monitor,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getDashboardStats } from "@/lib/admin-api";
import { formatDate } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

const barConfig = {
  count: { label: "Appointments", color: "hsl(var(--primary))" },
};

const pieConfig = {
  Clinic: { label: "Clinic", color: "hsl(var(--primary))" },
  Online: { label: "Online", color: "hsl(var(--accent))" },
};

function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading dashboard…</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load dashboard."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of clinic bookings and payments.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Appointments" value={data.totalAppointments} icon={CalendarDays} />
        <StatCard title="Today's Appointments" value={data.todayAppointments} icon={CalendarCheck} />
        <StatCard title="Clinic Appointments" value={data.clinicAppointments} icon={Stethoscope} />
        <StatCard title="Online Consultations" value={data.onlineConsultations} icon={Monitor} />
        <StatCard title="Paid Bookings" value={data.paidBookings} icon={Wallet} />
        <StatCard title="Pending Payments" value={data.pendingPayments} icon={CreditCard} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.appointmentsByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointment data yet.</p>
            ) : (
              <ChartContainer config={barConfig} className="h-[260px] w-full">
                <BarChart data={data.appointmentsByDay}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatDate(value).replace(/, \d{4}$/, "")}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking types</CardTitle>
          </CardHeader>
          <CardContent>
            {data.bookingsByType.every((item) => item.count === 0) ? (
              <p className="text-sm text-muted-foreground">No booking data yet.</p>
            ) : (
              <ChartContainer config={pieConfig} className="mx-auto h-[260px] w-full max-w-[320px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={data.bookingsByType}
                    dataKey="count"
                    nameKey="type"
                    innerRadius={55}
                    outerRadius={90}
                  >
                    {data.bookingsByType.map((entry) => (
                      <Cell
                        key={entry.type}
                        fill={`var(--color-${entry.type})`}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
