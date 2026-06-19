import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { signOutAdmin } from "@/lib/booking-api";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/admin/patients", label: "Patients", icon: Users },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="space-y-1">
      {navItems.map(({ to, label, icon: Icon, ...rest }) => {
        const exact = "exact" in rest && rest.exact;
        const active = exact ? location.pathname === to : location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOutAdmin();
    navigate({ to: "/admin/login" });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />

      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-64 flex-col border-r bg-background">
          <div className="flex items-center gap-2 px-6 py-5 border-b">
            <div className="w-9 h-9 rounded-lg bg-primary grid place-items-center">
              <Stethoscope className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold text-sm">Admin Panel</div>
              <div className="text-xs text-muted-foreground">Dr. Abid Ali Khan</div>
            </div>
          </div>
          <div className="flex-1 p-4">
            <NavLinks />
          </div>
          <div className="p-4 border-t">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-background px-4 py-3">
            <div className="font-semibold">Admin Panel</div>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="mt-6">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 mt-6"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </SheetContent>
            </Sheet>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
