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
