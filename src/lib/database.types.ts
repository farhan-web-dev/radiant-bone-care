export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookingType = "clinic" | "online";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "pending" | "paid" | "refunded";
export type PaymentMethod = "clinic" | "stripe";

export interface PendingBookingPayload {
  full_name: string;
  email: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  notes?: string | null;
  service?: string | null;
  booking_type: "online";
}

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string | null;
          full_name: string;
          email: string;
          phone: string;
          booking_type: BookingType;
          appointment_date: string;
          appointment_time: string;
          notes: string | null;
          service: string | null;
          booking_status: BookingStatus;
          payment_status: PaymentStatus;
          payment_method: PaymentMethod | null;
          stripe_reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          full_name: string;
          email: string;
          phone: string;
          booking_type: BookingType;
          appointment_date: string;
          appointment_time: string;
          notes?: string | null;
          service?: string | null;
          booking_status?: BookingStatus;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod | null;
          stripe_reference?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          full_name?: string;
          email?: string;
          phone?: string;
          booking_type?: BookingType;
          appointment_date?: string;
          appointment_time?: string;
          notes?: string | null;
          service?: string | null;
          booking_status?: BookingStatus;
          payment_status?: PaymentStatus;
          payment_method?: PaymentMethod | null;
          stripe_reference?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          phone: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          appointment_id: string;
          amount: number | null;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          stripe_reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          amount?: number | null;
          payment_method: PaymentMethod;
          payment_status?: PaymentStatus;
          stripe_reference?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          amount?: number | null;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          stripe_reference?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };
      pending_bookings: {
        Row: {
          id: string;
          session_token: string;
          payload: PendingBookingPayload;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_token?: string;
          payload: PendingBookingPayload;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_token?: string;
          payload?: PendingBookingPayload;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cleanup_expired_pending_bookings: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_clinic_appointment_pay_online: {
        Args: {
          p_full_name: string;
          p_email: string;
          p_phone: string;
          p_appointment_date: string;
          p_appointment_time: string;
          p_notes?: string | null;
          p_service?: string | null;
        };
        Returns: string;
      };
      confirm_appointment_payment: {
        Args: {
          p_appointment_id: string;
          p_stripe_reference?: string | null;
          p_amount?: number | null;
        };
        Returns: string;
      };
      confirm_pending_booking: {
        Args: {
          p_pending_id: string;
          p_stripe_reference?: string | null;
          p_amount?: number | null;
          p_ignore_expiry?: boolean;
        };
        Returns: string;
      };
      process_stripe_payment: {
        Args: {
          p_reference_id: string;
          p_stripe_reference?: string | null;
          p_amount?: number | null;
          p_event_id?: string | null;
        };
        Returns: string;
      };
      create_clinic_appointment: {
        Args: {
          p_full_name: string;
          p_email: string;
          p_phone: string;
          p_appointment_date: string;
          p_appointment_time: string;
          p_notes?: string | null;
          p_service?: string | null;
        };
        Returns: string;
      };
      create_pending_booking: {
        Args: {
          p_payload: PendingBookingPayload;
        };
        Returns: {
          id: string;
          session_token: string;
        }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_slot_available: {
        Args: {
          p_date: string;
          p_time: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      booking_status: BookingStatus;
      booking_type: BookingType;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PendingBooking = Database["public"]["Tables"]["pending_bookings"]["Row"];
export type AdminUser = Database["public"]["Tables"]["admin_users"]["Row"];
