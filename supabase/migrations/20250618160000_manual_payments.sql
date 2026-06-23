-- Add Manual Payment Methods and Schema Updates

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'easypaisa';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'jazzcash';

ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'pending_verification';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'rejected';

-- Need to add columns to appointments and payments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS transaction_id text,
ADD COLUMN IF NOT EXISTS payment_screenshot_url text;

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS transaction_id text,
ADD COLUMN IF NOT EXISTS payment_screenshot_url text;

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_screenshots', 'payment_screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage (Insert for anon/auth, Select for public since bucket is public)
CREATE POLICY "Anyone can upload payment screenshots" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'payment_screenshots');

CREATE POLICY "Anyone can view payment screenshots" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'payment_screenshots');

-- Manual Payment RPC
CREATE OR REPLACE FUNCTION public.create_manual_payment_appointment(
  p_full_name text,
  p_email text,
  p_phone text,
  p_appointment_date date,
  p_appointment_time time,
  p_payment_method public.payment_method,
  p_transaction_id text,
  p_payment_screenshot_url text,
  p_notes text DEFAULT NULL,
  p_service text DEFAULT NULL,
  p_booking_type public.booking_type DEFAULT 'clinic'
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
    payment_method,
    transaction_id,
    payment_screenshot_url
  )
  VALUES (
    trim(p_full_name),
    lower(trim(p_email)),
    trim(p_phone),
    p_booking_type,
    p_appointment_date,
    p_appointment_time,
    NULLIF(trim(p_notes), ''),
    NULLIF(trim(p_service), ''),
    'confirmed',
    'pending_verification',
    p_payment_method,
    NULLIF(trim(p_transaction_id), ''),
    NULLIF(trim(p_payment_screenshot_url), '')
  )
  RETURNING id INTO v_appointment_id;

  INSERT INTO public.payments (
    appointment_id,
    payment_method,
    payment_status,
    transaction_id,
    payment_screenshot_url
  )
  VALUES (
    v_appointment_id,
    p_payment_method,
    'pending_verification',
    NULLIF(trim(p_transaction_id), ''),
    NULLIF(trim(p_payment_screenshot_url), '')
  );

  RETURN v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_manual_payment_appointment(text, text, text, date, time, public.payment_method, text, text, text, text, public.booking_type) TO anon, authenticated;
