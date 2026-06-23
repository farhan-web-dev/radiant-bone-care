import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarCheck,
  CheckCircle2,
  Video,
  MapPin,
  Coins,
  CreditCard,
  Lock,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  APPOINTMENT_TIME_SLOTS,
  formatTimeLabel,
} from "@/lib/appointment-slots";
import {
  BookingError,
  checkSlotAvailable,
  createClinicAppointment,
  createClinicAppointmentPayOnline,
  createPendingBooking,
  storeBookingSession,
} from "@/lib/booking-api";
import {
  buildStripePaymentUrl,
  getClinicPaymentLink,
  getOnlineConsultationPaymentLink,
} from "@/lib/env";
import { uploadPaymentScreenshot, createManualPaymentAppointment } from "@/lib/booking-api";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  phone: z.string().trim().min(7, "Valid phone required").max(20),
  email: z.string().trim().email("Valid email required").max(120),
  service: z.string().min(1, "Please select a service"),
  date: z.string().min(1, "Please pick a date"),
  time: z.string().min(1, "Please pick a time"),
  message: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

const services = [
  "Orthopedic Consultation",
  "Fracture Treatment",
  "Trauma Surgery",
  "Joint Pain Treatment",
  "Bone & Joint Care",
  "Sports Injury",
  "Arthritis Management",
  "Follow-Up Care",
];

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block group">
      <span className="block text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2">
        {label}
      </span>
      <div className="relative">{children}</div>
      {error && <span className="text-xs text-destructive mt-1 block">{error}</span>}
    </label>
  );
}

export default function Appointment() {
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<"Online Consultation" | "Visit to Clinic">(
    "Online Consultation",
  );
  const [paymentMethod, setPaymentMethod] = useState<"clinic" | "stripe" | "easypaisa" | "jazzcash">("stripe");
  const [detailsData, setDetailsData] = useState<FormData & { bookingType: string; isManualPending?: boolean } | null>(null);
  const [txnId, setTxnId] = useState("");
  
  const [txnIdInput, setTxnIdInput] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      service: "",
      date: "",
      time: "",
      message: "",
    },
  });

  const baseFee = 1000;
  const isStripe = paymentMethod === "stripe";
  const processingFee = isStripe ? 50 : 0;
  const totalAmount = baseFee + processingFee;

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);

    try {
      const slotAvailable = await checkSlotAvailable(data.date, data.time);
      if (!slotAvailable) {
        throw new BookingError("This appointment slot is already booked. Please choose another time.");
      }

      const bookingDetails = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        service: data.service,
        date: data.date,
        time: formatTimeLabel(data.time),
        bookingType,
        message: data.message,
      };

      if (bookingType === "Visit to Clinic" && paymentMethod === "clinic") {
        const appointmentId = await createClinicAppointment({
          fullName: data.name,
          email: data.email,
          phone: data.phone,
          appointmentDate: data.date,
          appointmentTime: data.time,
          notes: data.message,
          service: data.service,
        });

        setTxnId(appointmentId.slice(0, 8).toUpperCase());
        setDetailsData({ ...data, bookingType });
        setSuccess(true);
        reset();
        return;
      }

      if (paymentMethod === "easypaisa" || paymentMethod === "jazzcash") {
        if (!txnIdInput.trim()) {
          throw new BookingError("Transaction ID is required for manual payments.");
        }
        
        let screenshotUrl = undefined;
        if (screenshotFile) {
          screenshotUrl = await uploadPaymentScreenshot(screenshotFile);
        }

        const appointmentId = await createManualPaymentAppointment({
          fullName: data.name,
          email: data.email,
          phone: data.phone,
          appointmentDate: data.date,
          appointmentTime: data.time,
          notes: data.message,
          service: data.service,
          bookingType: bookingType === "Visit to Clinic" ? "clinic" : "online",
          paymentMethod,
          transactionId: txnIdInput.trim(),
          paymentScreenshotUrl: screenshotUrl,
        });

        setTxnId(appointmentId.slice(0, 8).toUpperCase());
        setDetailsData({ ...data, bookingType, isManualPending: true });
        setSuccess(true);
        reset();
        setTxnIdInput("");
        setScreenshotFile(null);
        return;
      }

      const sessionDetails = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        service: data.service,
        date: data.date,
        time: formatTimeLabel(data.time),
        bookingType,
      };

      if (bookingType === "Visit to Clinic" && paymentMethod === "stripe") {
        const paymentLink = getClinicPaymentLink();
        if (!paymentLink) {
          throw new BookingError("Clinic payment link is not configured.");
        }

        const appointmentId = await createClinicAppointmentPayOnline({
          fullName: data.name,
          email: data.email,
          phone: data.phone,
          appointmentDate: data.date,
          appointmentTime: data.time,
          notes: data.message,
          service: data.service,
        });

        storeBookingSession("clinic_online", appointmentId, sessionDetails);
        window.location.href = buildStripePaymentUrl(paymentLink, {
          client_reference_id: appointmentId,
          prefilled_email: data.email,
        });
        return;
      }

      const paymentLink = getOnlineConsultationPaymentLink();
      if (!paymentLink) {
        throw new BookingError("Online consultation payment link is not configured.");
      }

      const pending = await createPendingBooking({
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        appointment_date: data.date,
        appointment_time: data.time,
        notes: data.message ?? null,
        service: data.service ?? null,
        booking_type: "online",
      });

      storeBookingSession("online_consultation", pending.id, sessionDetails);
      window.location.href = buildStripePaymentUrl(paymentLink, {
        client_reference_id: pending.id,
        prefilled_email: data.email,
      });
    } catch (error) {
      console.error("Booking error:", error);
      setSubmitError(
        error instanceof BookingError
          ? error.message
          : error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
      );
    }
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
    setDetailsData(null);
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-background border border-input focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all";

  return (
    <section id="appointment" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 gradient-hero-bg" />
      <div className="absolute inset-0 gradient-mesh-bg opacity-60" />

      <div className="container mx-auto px-6 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold tracking-widest uppercase text-accent">
              Appointment System
            </span>
            <h2 className="mt-3 text-4xl md:text-5xl font-display font-semibold">
              Schedule your <span className="gradient-text">appointment</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Select online or clinic session. Secure payments via Stripe.
            </p>
          </motion.div>

          <div className="glass-strong rounded-3xl p-6 md:p-10 shadow-elegant relative overflow-hidden">
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Full Name" error={errors.name?.message}>
                  <input {...register("name")} className={inputCls} placeholder="John Doe" />
                </Field>
                <Field label="Phone Number" error={errors.phone?.message}>
                  <input {...register("phone")} className={inputCls} placeholder="0300-1234567" />
                </Field>
                <Field label="Email Address" error={errors.email?.message}>
                  <input
                    type="email"
                    {...register("email")}
                    className={inputCls}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Select Service" error={errors.service?.message}>
                  <select {...register("service")} className={inputCls} defaultValue="">
                    <option value="" disabled>
                      Choose a service…
                    </option>
                    {services.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Preferred Date" error={errors.date?.message}>
                  <input type="date" {...register("date")} className={inputCls} />
                </Field>
                <Field label="Preferred Time" error={errors.time?.message}>
                  <select {...register("time")} className={inputCls} defaultValue="">
                    <option value="" disabled>
                      Choose a time…
                    </option>
                    {APPOINTMENT_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {formatTimeLabel(slot)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Message (optional)" error={errors.message?.message}>
                  <input
                    {...register("message")}
                    className={inputCls}
                    placeholder="Briefly describe your orthopedic concern"
                  />
                </Field>
              </div>

              <div className="pt-4 border-t border-border">
                <span className="block text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
                  Booking Type
                </span>
                <div className="grid md:grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      setBookingType("Online Consultation");
                      if (paymentMethod === "clinic") setPaymentMethod("stripe");
                    }}
                    className={`relative p-5 rounded-2xl cursor-pointer border-2 transition-all flex items-start gap-4 ${
                      bookingType === "Online Consultation"
                        ? "border-accent bg-accent/5 shadow-soft"
                        : "border-border hover:border-accent/40 bg-background"
                    }`}
                  >
                    <div className="p-3 rounded-xl bg-accent/10 text-accent">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Online Consultation</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Consult via video call. Secure payment required.
                      </p>
                      <div className="mt-3 font-semibold text-accent text-sm">PKR 1,000</div>
                    </div>
                    {bookingType === "Online Consultation" && (
                      <div className="absolute top-4 right-4 text-accent">
                        <CheckCircle2 className="w-5 h-5 fill-accent text-accent-foreground" />
                      </div>
                    )}
                  </div>

                  <div
                    onClick={() => setBookingType("Visit to Clinic")}
                    className={`relative p-5 rounded-2xl cursor-pointer border-2 transition-all flex items-start gap-4 ${
                      bookingType === "Visit to Clinic"
                        ? "border-accent bg-accent/5 shadow-soft"
                        : "border-border hover:border-accent/40 bg-background"
                    }`}
                  >
                    <div className="p-3 rounded-xl bg-accent/10 text-accent">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Visit to Clinic</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        In-person session. Online payment is optional.
                      </p>
                      <div className="mt-3 font-semibold text-accent text-sm">PKR 1,000</div>
                    </div>
                    {bookingType === "Visit to Clinic" && (
                      <div className="absolute top-4 right-4 text-accent">
                        <CheckCircle2 className="w-5 h-5 fill-accent text-accent-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-secondary border border-border"
                >
                  <span className="block text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
                    Payment Method
                  </span>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {bookingType === "Visit to Clinic" && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("clinic")}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          paymentMethod === "clinic"
                            ? "bg-background border-accent font-semibold text-foreground shadow-sm"
                            : "bg-background/60 border-border text-muted-foreground hover:bg-background"
                        }`}
                      >
                        <Coins className="w-5 h-5 text-accent" />
                        <span className="text-xs">Pay at Clinic</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("stripe")}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                        paymentMethod === "stripe"
                          ? "bg-background border-accent font-semibold text-foreground shadow-sm"
                          : "bg-background/60 border-border text-muted-foreground hover:bg-background"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-accent" />
                      <span className="text-xs text-center leading-tight">Pay Online<br/>(Card/Stripe)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("easypaisa")}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                        paymentMethod === "easypaisa"
                          ? "bg-easypaisa border-green-500 font-semibold text-foreground shadow-sm"
                          : "bg-background/60 border-border text-muted-foreground hover:bg-background"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white font-bold">EP</div>
                      <span className="text-xs">Easypaisa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("jazzcash")}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                        paymentMethod === "jazzcash"
                          ? "bg-jazzcash border-red-500 font-semibold text-foreground shadow-sm"
                          : "bg-background/60 border-border text-muted-foreground hover:bg-background"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white font-bold">JC</div>
                      <span className="text-xs">JazzCash</span>
                    </button>
                  </div>
                </motion.div>
              </div>

              {(paymentMethod === "easypaisa" || paymentMethod === "jazzcash") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-5 rounded-xl bg-muted/30 border border-border space-y-4"
                >
                  <h4 className="font-semibold text-sm">Manual Payment Instructions</h4>
                  <p className="text-xs text-muted-foreground">
                    Please send exactly <strong>PKR {totalAmount.toLocaleString()}</strong> to our {paymentMethod === "easypaisa" ? "Easypaisa" : "JazzCash"} account below:
                  </p>
                  
                  <div className="bg-background p-4 rounded-xl border border-border text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-semibold">Account Title</span>
                    <span className="text-sm font-bold mb-3">Radiant Bone Care</span>
                    
                    <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-semibold">Account Number</span>
                    <span className="text-2xl font-display font-bold text-accent tracking-wider">0348 5661687</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Field label="Transaction / Reference ID *" error={submitError?.includes("Transaction") ? submitError : undefined}>
                      <input 
                        type="text" 
                        value={txnIdInput} 
                        onChange={(e) => { setTxnIdInput(e.target.value); setSubmitError(null); }}
                        className={inputCls}
                        placeholder="Enter the 11-digit or 12-digit Trx ID" 
                      />
                    </Field>
                    
                    <Field label="Payment Screenshot (Optional)">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                      />
                    </Field>
                  </div>
                </motion.div>
              )}

              {isStripe && (
                <div className="p-4 rounded-xl bg-muted/60 text-sm text-muted-foreground flex gap-3 items-start">
                  <Lock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <p>
                    You will be securely redirected to Stripe to complete payment. After payment,
                    you&apos;ll return here to confirm your booking.
                  </p>
                </div>
              )}

              <div className="glass p-5 rounded-2xl border border-border space-y-3">
                <h4 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground">
                  Order Summary
                </h4>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Session Type</span>
                  <span className="font-medium">{bookingType}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Professional Fee</span>
                  <span className="font-semibold">PKR {baseFee.toLocaleString()}</span>
                </div>
                {isStripe && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Digital Processing</span>
                    <span className="font-semibold">PKR {processingFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-sm font-semibold">Total Amount</span>
                  <span className="text-lg font-bold text-accent">
                    PKR {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-full shadow-elegant h-12"
              >
                {isSubmitting ? (
                  <>Processing booking details…</>
                ) : isStripe ? (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" /> Continue to Secure Payment
                  </>
                ) : paymentMethod === "easypaisa" || paymentMethod === "jazzcash" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Submit Payment & Book
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4 mr-2" /> Confirm Appointment (Pay at Clinic)
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <Dialog open={success} onOpenChange={handleCloseSuccess}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-none rounded-3xl shadow-elegant">
          <div className="p-6 bg-gradient-primary text-primary-foreground relative text-center">
            <div className="absolute top-0 inset-x-0 h-2 bg-accent" />
            <div className="mx-auto w-14 h-14 rounded-full bg-primary-glow border border-primary-foreground/20 grid place-items-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-accent animate-bounce" />
            </div>
            <h3 className="font-display text-2xl font-bold">Booking Confirmed</h3>
            {detailsData?.isManualPending && (
              <div className="px-6 pb-2 text-center text-sm font-semibold text-accent animate-pulse">
                Your order has been placed successfully. We will verify your payment and update the status shortly.
              </div>
            )}
            <p className="text-xs text-primary-foreground/80 mt-1">
              Your appointment registration is successfully processed
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="border border-dashed border-border rounded-2xl p-4 bg-muted/30 space-y-4 text-sm relative">
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-r border-border" />
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-l border-border" />

              <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-border pb-3">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ref: {txnId}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{detailsData?.date || "Scheduled Date"}</span>
                </div>
              </div>

              <div className="space-y-2 pb-3 border-b border-border">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Patient Name</span>
                  <span className="font-medium text-xs">{detailsData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Phone Number</span>
                  <span className="font-medium text-xs">{detailsData?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Time</span>
                  <span className="font-medium text-xs">
                    {detailsData?.time ? formatTimeLabel(detailsData.time) : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Orthopedic Specialist</span>
                  <span className="font-semibold text-xs text-accent">Dr. Abid Ali Khan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Requested Service</span>
                  <span className="font-medium text-xs">{detailsData?.service}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Session Delivery</span>
                  <span className="font-medium text-xs">{detailsData?.bookingType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Payment Status</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/20 text-accent border border-accent/25">
                    {detailsData?.isManualPending ? "PENDING VERIFICATION" : "PAY AT CLINIC"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-semibold text-foreground">Amount Due</span>
                  <span className="text-base font-bold text-accent">
                    PKR {baseFee.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground leading-relaxed">
              <Sparkles className="w-4 h-4 text-accent inline-block mr-1 mb-0.5 animate-pulse" />
              Thank you! Our clinical coordinator will reach out on WhatsApp/SMS soon.
            </div>

            <Button
              onClick={handleCloseSuccess}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-full h-11"
            >
              Done & Return
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
