import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAdminSession, signOutAdmin, verifyAdminAccess } from "@/lib/booking-api";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;

    const session = await getAdminSession();
    if (!session) {
      throw redirect({ to: "/admin/login" });
    }

    const access = await verifyAdminAccess(session.user.id);
    if (!access.isAdmin) {
      await signOutAdmin();
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminShell,
});

function AdminShell() {
  const location = useLocation();
  if (location.pathname === "/admin/login") {
    return <Outlet />;
  }
  return <AdminLayout />;
}
