import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AdminUser } from "@/lib/database.types";

const LOG_PREFIX = "[admin-auth]";

export type AdminAccessResult = {
  isAdmin: boolean;
  userId?: string;
  email?: string;
  adminUser?: AdminUser;
  reason?: string;
};

function log(message: string, details?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    if (details) {
      console.debug(`${LOG_PREFIX} ${message}`, details);
    } else {
      console.debug(`${LOG_PREFIX} ${message}`);
    }
  }
}

/**
 * Verify admin access by checking admin_users for the authenticated user.
 * Uses direct table lookup (not is_admin RPC) so RLS policy on own row applies.
 */
export async function verifyAdminAccess(userId?: string): Promise<AdminAccessResult> {
  if (!isSupabaseConfigured()) {
    log("Access denied: Supabase not configured");
    return { isAdmin: false, reason: "supabase_not_configured" };
  }

  let resolvedUserId = userId;
  let resolvedEmail: string | undefined;

  if (!resolvedUserId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      log("Access denied: not authenticated", { error: userError?.message });
      return { isAdmin: false, reason: userError?.message ?? "not_authenticated" };
    }

    resolvedUserId = user.id;
    resolvedEmail = user.email ?? undefined;
    log("Authenticated user", { userId: resolvedUserId, email: resolvedEmail });
  } else {
    log("Checking admin access for provided userId", { userId: resolvedUserId });
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  log("admin_users lookup result", {
    userId: resolvedUserId,
    found: Boolean(adminUser),
    error: adminError?.message,
    adminEmail: adminUser?.email,
  });

  if (adminError) {
    log("Access denied: admin_users query failed", { error: adminError.message });
    return {
      isAdmin: false,
      userId: resolvedUserId,
      email: resolvedEmail,
      reason: adminError.message,
    };
  }

  if (!adminUser) {
    log("Access denied: user not in admin_users", { userId: resolvedUserId, email: resolvedEmail });
    return {
      isAdmin: false,
      userId: resolvedUserId,
      email: resolvedEmail,
      reason: "not_in_admin_users",
    };
  }

  log("Access granted", { userId: resolvedUserId, email: adminUser.email });
  return {
    isAdmin: true,
    userId: resolvedUserId,
    email: adminUser.email,
    adminUser,
  };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const result = await verifyAdminAccess();
  return result.isAdmin;
}
