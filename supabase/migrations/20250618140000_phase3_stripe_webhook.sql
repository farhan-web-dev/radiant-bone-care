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
