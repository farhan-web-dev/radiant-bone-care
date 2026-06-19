-- Fix admin auth: allow users to read their own admin_users row (breaks chicken-and-egg with is_admin())

DROP POLICY IF EXISTS "Admins can view admin registry" ON public.admin_users;

CREATE POLICY "Admins can read own admin record"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can still list all admin records (for future admin management UI)
CREATE POLICY "Admins can view admin registry"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
