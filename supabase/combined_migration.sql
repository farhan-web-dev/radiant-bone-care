-- Radiant Bone Care — initial Supabase schema (Phase 1)
-- Appointments, payments, patients, pending bookings, admin access, RLS

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.booking_type AS ENUM ('clinic', 'online');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'refunded');
CREATE TYPE public.payment_method AS ENUM ('clinic', 'stripe');

-- ---------------------------------------------------------------------------
-- Patients (auto-generated from bookings)
-- ---------------------------------------------------------------------------
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patients_email_phone_unique UNIQUE (email, phone)
);

CREATE INDEX patients_email_idx ON public.patients (email);
CREATE INDEX patients_phone_idx ON public.patients (phone);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients (id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  booking_type public.booking_type NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  notes text,
  service text,
  booking_status public.booking_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method,
  stripe_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT appointments_full_name_check CHECK (char_length(trim(full_name)) >= 2),
  CONSTRAINT appointments_phone_check CHECK (char_length(trim(phone)) >= 7)
);

-- Prevent double booking for active appointments (cancelled slots can be rebooked)
CREATE UNIQUE INDEX appointments_active_slot_unique
  ON public.appointments (appointment_date, appointment_time)
  WHERE booking_status <> 'cancelled';

CREATE INDEX appointments_date_idx ON public.appointments (appointment_date);
CREATE INDEX appointments_booking_status_idx ON public.appointments (booking_status);
CREATE INDEX appointments_payment_status_idx ON public.appointments (payment_status);
CREATE INDEX appointments_booking_type_idx ON public.appointments (booking_type);
CREATE INDEX appointments_created_at_idx ON public.appointments (created_at DESC);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments (id) ON DELETE CASCADE,
  amount numeric(10, 2),
  payment_method public.payment_method NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  stripe_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_appointment_id_idx ON public.payments (appointment_id);
CREATE INDEX payments_payment_status_idx ON public.payments (payment_status);
CREATE INDEX payments_created_at_idx ON public.payments (created_at DESC);

-- ---------------------------------------------------------------------------
-- Pending bookings (online consultation pre-payment)
-- ---------------------------------------------------------------------------
CREATE TABLE public.pending_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_bookings_payload_check CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX pending_bookings_expires_at_idx ON public.pending_bookings (expires_at);
CREATE INDEX pending_bookings_session_token_idx ON public.pending_bookings (session_token);

-- ---------------------------------------------------------------------------
-- Admin users (linked to Supabase Auth)
-- ---------------------------------------------------------------------------
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Helpers & triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER patients_set_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.upsert_patient_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
BEGIN
  INSERT INTO public.patients (full_name, email, phone)
  VALUES (NEW.full_name, lower(trim(NEW.email)), trim(NEW.phone))
  ON CONFLICT (email, phone) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        updated_at = now()
  RETURNING id INTO v_patient_id;

  NEW.patient_id := v_patient_id;
  NEW.email := lower(trim(NEW.email));
  NEW.phone := trim(NEW.phone);
  NEW.full_name := trim(NEW.full_name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER appointments_upsert_patient
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_patient_from_appointment();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_slot_available(p_date date, p_time time)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.appointments
    WHERE appointment_date = p_date
      AND appointment_time = p_time
      AND booking_status <> 'cancelled'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.pending_bookings
    WHERE expires_at > now()
      AND (payload ->> 'appointment_date')::date = p_date
      AND (payload ->> 'appointment_time')::time = p_time
  );
$$;

-- Public booking RPC: clinic appointment with pay-at-clinic (Phase 2)
CREATE OR REPLACE FUNCTION public.create_clinic_appointment(
  p_full_name text,
  p_email text,
  p_phone text,
  p_appointment_date date,
  p_appointment_time time,
  p_notes text DEFAULT NULL,
  p_service text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id uuid;
BEGIN
  IF NOT public.is_slot_available(p_appointment_date, p_appointment_time) THEN
    RAISE EXCEPTION 'This appointment slot is already booked.'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.appointments (
    full_name,
    email,
    phone,
    booking_type,
    appointment_date,
    appointment_time,
    notes,
    service,
    booking_status,
    payment_status,
    payment_method
  )
  VALUES (
    trim(p_full_name),
    lower(trim(p_email)),
    trim(p_phone),
    'clinic',
    p_appointment_date,
    p_appointment_time,
    NULLIF(trim(p_notes), ''),
    NULLIF(trim(p_service), ''),
    'confirmed',
    'pending',
    'clinic'
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

-- Public booking RPC: save pending online consultation (Phase 2)
CREATE OR REPLACE FUNCTION public.create_pending_booking(
  p_payload jsonb
)
RETURNS TABLE (id uuid, session_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_token text;
  v_date date;
  v_time time;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Invalid booking payload.'
      USING ERRCODE = '22023';
  END IF;

  v_date := (p_payload ->> 'appointment_date')::date;
  v_time := (p_payload ->> 'appointment_time')::time;

  IF v_date IS NULL OR v_time IS NULL THEN
    RAISE EXCEPTION 'appointment_date and appointment_time are required.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_slot_available(v_date, v_time) THEN
    RAISE EXCEPTION 'This appointment slot is already booked.'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.pending_bookings (payload)
  VALUES (p_payload)
  RETURNING pending_bookings.id, pending_bookings.session_token
  INTO v_id, v_token;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

-- Cleanup expired pending bookings (call from cron in later phases)
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.pending_bookings
  WHERE expires_at < now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Patients: admin only
CREATE POLICY "Admins can select patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Appointments: admin full access; public uses RPC functions
CREATE POLICY "Admins can select appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Payments: admin only
CREATE POLICY "Admins can select payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pending bookings: admin read; public writes via RPC
CREATE POLICY "Admins can select pending bookings"
  ON public.pending_bookings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete pending bookings"
  ON public.pending_bookings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Admin users: admins can read own row
CREATE POLICY "Admins can view admin registry"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants for public RPC functions
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_slot_available(date, time) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_clinic_appointment(text, text, text, date, time, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_booking(jsonb) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_pending_bookings() FROM anon, authenticated;

-- Phase 2: Stripe payment-link flows and confirmation RPCs

-- Clinic appointment with pay-online (blocks slot, payment pending until Stripe success)
CREATE OR REPLACE FUNCTION public.create_clinic_appointment_pay_online(
  p_full_name text,
  p_email text,
  p_phone text,
  p_appointment_date date,
  p_appointment_time time,
  p_notes text DEFAULT NULL,
  p_service text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id uuid;
BEGIN
  IF NOT public.is_slot_available(p_appointment_date, p_appointment_time) THEN
    RAISE EXCEPTION 'This appointment slot is already booked.'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.appointments (
    full_name,
    email,
    phone,
    booking_type,
    appointment_date,
    appointment_time,
    notes,
    service,
    booking_status,
    payment_status,
    payment_method
  )
  VALUES (
    trim(p_full_name),
    lower(trim(p_email)),
    trim(p_phone),
    'clinic',
    p_appointment_date,
    p_appointment_time,
    NULLIF(trim(p_notes), ''),
    NULLIF(trim(p_service), ''),
    'confirmed',
    'pending',
    NULL
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

-- Confirm payment for clinic pay-online after Stripe redirect
CREATE OR REPLACE FUNCTION public.confirm_appointment_payment(
  p_appointment_id uuid,
  p_stripe_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.appointments%ROWTYPE;
  v_payment_id uuid;
BEGIN
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_appointment.payment_status = 'paid' THEN
    RETURN p_appointment_id;
  END IF;

  UPDATE public.appointments
  SET
    payment_status = 'paid',
    payment_method = 'stripe',
    stripe_reference = COALESCE(NULLIF(trim(p_stripe_reference), ''), stripe_reference)
  WHERE id = p_appointment_id;

  INSERT INTO public.payments (
    appointment_id,
    payment_method,
    payment_status,
    stripe_reference
  )
  VALUES (
    p_appointment_id,
    'stripe',
    'paid',
    NULLIF(trim(p_stripe_reference), '')
  )
  RETURNING id INTO v_payment_id;

  RETURN p_appointment_id;
END;
$$;

-- Confirm online consultation after Stripe redirect (creates appointment from pending)
CREATE OR REPLACE FUNCTION public.confirm_pending_booking(
  p_pending_id uuid,
  p_stripe_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending public.pending_bookings%ROWTYPE;
  v_payload jsonb;
  v_date date;
  v_time time;
  v_appointment_id uuid;
BEGIN
  SELECT * INTO v_pending
  FROM public.pending_bookings
  WHERE id = p_pending_id
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending booking not found or expired.'
      USING ERRCODE = 'P0002';
  END IF;

  v_payload := v_pending.payload;
  v_date := (v_payload ->> 'appointment_date')::date;
  v_time := (v_payload ->> 'appointment_time')::time;

  IF NOT public.is_slot_available(v_date, v_time) THEN
    RAISE EXCEPTION 'This appointment slot is already booked.'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.appointments (
    full_name,
    email,
    phone,
    booking_type,
    appointment_date,
    appointment_time,
    notes,
    service,
    booking_status,
    payment_status,
    payment_method,
    stripe_reference
  )
  VALUES (
    trim(v_payload ->> 'full_name'),
    lower(trim(v_payload ->> 'email')),
    trim(v_payload ->> 'phone'),
    'online',
    v_date,
    v_time,
    NULLIF(trim(v_payload ->> 'notes'), ''),
    NULLIF(trim(v_payload ->> 'service'), ''),
    'confirmed',
    'paid',
    'stripe',
    NULLIF(trim(p_stripe_reference), '')
  )
  RETURNING id INTO v_appointment_id;

  INSERT INTO public.payments (
    appointment_id,
    payment_method,
    payment_status,
    stripe_reference
  )
  VALUES (
    v_appointment_id,
    'stripe',
    'paid',
    NULLIF(trim(p_stripe_reference), '')
  );

  DELETE FROM public.pending_bookings WHERE id = p_pending_id;

  RETURN v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_clinic_appointment_pay_online(text, text, text, date, time, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_appointment_payment(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_pending_booking(uuid, text) TO anon, authenticated;

-- Phase 3: Stripe webhook processing, idempotent payment confirmation

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  reference_id uuid,
  stripe_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No public policies — service role / security definer only

DROP FUNCTION IF EXISTS public.confirm_appointment_payment(uuid, text);
DROP FUNCTION IF EXISTS public.confirm_pending_booking(uuid, text);

CREATE OR REPLACE FUNCTION public.confirm_appointment_payment(
  p_appointment_id uuid,
  p_stripe_reference text DEFAULT NULL,
  p_amount numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_appointment.payment_status = 'paid' THEN
    RETURN p_appointment_id;
  END IF;

  UPDATE public.appointments
  SET
    payment_status = 'paid',
    payment_method = 'stripe',
    stripe_reference = COALESCE(NULLIF(trim(p_stripe_reference), ''), stripe_reference)
  WHERE id = p_appointment_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.payments
    WHERE appointment_id = p_appointment_id AND payment_status = 'paid'
  ) THEN
    INSERT INTO public.payments (
      appointment_id,
      amount,
      payment_method,
      payment_status,
      stripe_reference
    )
    VALUES (
      p_appointment_id,
      p_amount,
      'stripe',
      'paid',
      NULLIF(trim(p_stripe_reference), '')
    );
  END IF;

  RETURN p_appointment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_pending_booking(
  p_pending_id uuid,
  p_stripe_reference text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_ignore_expiry boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending public.pending_bookings%ROWTYPE;
  v_payload jsonb;
  v_date date;
  v_time time;
  v_appointment_id uuid;
BEGIN
  SELECT * INTO v_pending
  FROM public.pending_bookings
  WHERE id = p_pending_id
    AND (p_ignore_expiry OR expires_at > now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending booking not found or expired.'
      USING ERRCODE = 'P0002';
  END IF;

  v_payload := v_pending.payload;
  v_date := (v_payload ->> 'appointment_date')::date;
  v_time := (v_payload ->> 'appointment_time')::time;

  IF NOT public.is_slot_available(v_date, v_time) THEN
    RAISE EXCEPTION 'This appointment slot is already booked.'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.appointments (
    full_name,
    email,
    phone,
    booking_type,
    appointment_date,
    appointment_time,
    notes,
    service,
    booking_status,
    payment_status,
    payment_method,
    stripe_reference
  )
  VALUES (
    trim(v_payload ->> 'full_name'),
    lower(trim(v_payload ->> 'email')),
    trim(v_payload ->> 'phone'),
    'online',
    v_date,
    v_time,
    NULLIF(trim(v_payload ->> 'notes'), ''),
    NULLIF(trim(v_payload ->> 'service'), ''),
    'confirmed',
    'paid',
    'stripe',
    NULLIF(trim(p_stripe_reference), '')
  )
  RETURNING id INTO v_appointment_id;

  INSERT INTO public.payments (
    appointment_id,
    amount,
    payment_method,
    payment_status,
    stripe_reference
  )
  VALUES (
    v_appointment_id,
    p_amount,
    'stripe',
    'paid',
    NULLIF(trim(p_stripe_reference), '')
  );

  DELETE FROM public.pending_bookings WHERE id = p_pending_id;

  RETURN v_appointment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_stripe_payment(
  p_reference_id uuid,
  p_stripe_reference text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_event_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.appointments%ROWTYPE;
  v_pending_exists boolean;
  v_result uuid;
BEGIN
  IF p_event_id IS NOT NULL AND trim(p_event_id) <> '' THEN
    IF EXISTS (SELECT 1 FROM public.stripe_webhook_events WHERE event_id = trim(p_event_id)) THEN
      SELECT reference_id INTO v_result
      FROM public.stripe_webhook_events
      WHERE event_id = trim(p_event_id);
      RETURN v_result;
    END IF;
  END IF;

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_reference_id;

  IF FOUND THEN
    v_result := public.confirm_appointment_payment(
      p_reference_id,
      p_stripe_reference,
      p_amount
    );
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.pending_bookings WHERE id = p_reference_id
    ) INTO v_pending_exists;

    IF v_pending_exists THEN
      v_result := public.confirm_pending_booking(
        p_reference_id,
        p_stripe_reference,
        p_amount,
        true
      );
    ELSE
      RAISE EXCEPTION 'No booking found for reference id.'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF p_event_id IS NOT NULL AND trim(p_event_id) <> '' THEN
    INSERT INTO public.stripe_webhook_events (event_id, reference_id, stripe_reference)
    VALUES (trim(p_event_id), p_reference_id, NULLIF(trim(p_stripe_reference), ''))
    ON CONFLICT (event_id) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_stripe_payment(uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_stripe_payment(uuid, text, numeric, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_appointment_payment(uuid, text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_pending_booking(uuid, text, numeric, boolean) TO anon, authenticated;

