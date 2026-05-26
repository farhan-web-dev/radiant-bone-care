import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarCheck, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  phone: z.string().trim().min(7, "Valid phone required").max(20),
  email: z.string().trim().email("Valid email required").max(120),
  service: z.string().min(1, "Please select a service"),
  date: z.string().min(1, "Please pick a date"),
  message: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

const services = [
  "Orthopedic Consultation", "Fracture Treatment", "Trauma Surgery",
  "Joint Pain Treatment", "Bone & Joint Care", "Sports Injury",
  "Arthritis Management", "Follow-Up Care",
];

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block group">
      <span className="block text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive mt-1 block">{error}</span>}
    </label>
  );
}

export default function Appointment() {
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    console.log("Appointment:", data);
    setSuccess(true);
    reset();
  };

  const inputCls = "w-full px-4 py-3 rounded-xl bg-background border border-input focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all";

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
            <span className="text-sm font-semibold tracking-widest uppercase text-accent">Book Now</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-display font-semibold">
              Schedule your <span className="gradient-text">appointment</span>
            </h2>
            <p className="mt-3 text-muted-foreground">Quick, confidential, and confirmed within hours.</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit(onSubmit)}
            className="glass-strong rounded-3xl p-8 md:p-10 shadow-elegant"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Full Name" error={errors.name?.message}>
                <input {...register("name")} className={inputCls} placeholder="John Doe" />
              </Field>
              <Field label="Phone Number" error={errors.phone?.message}>
                <input {...register("phone")} className={inputCls} placeholder="0300-1234567" />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input type="email" {...register("email")} className={inputCls} placeholder="you@example.com" />
              </Field>
              <Field label="Select Service" error={errors.service?.message}>
                <select {...register("service")} className={inputCls} defaultValue="">
                  <option value="" disabled>Choose a service…</option>
                  {services.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Preferred Date" error={errors.date?.message}>
                <input type="date" {...register("date")} className={inputCls} />
              </Field>
              <Field label="Message (optional)" error={errors.message?.message}>
                <input {...register("message")} className={inputCls} placeholder="Briefly describe your concern" />
              </Field>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="mt-8 w-full bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-full shadow-elegant"
            >
              {isSubmitting ? (
                <>Submitting…</>
              ) : (
                <><CalendarCheck className="w-4 h-4 mr-2" /> Confirm Appointment <Send className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </motion.form>
        </div>
      </div>

      <Dialog open={success} onOpenChange={setSuccess}>
        <DialogContent className="text-center">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-accent/15 grid place-items-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <DialogTitle className="font-display text-2xl">Appointment Received</DialogTitle>
            <DialogDescription>
              Thank you! Our team will confirm your booking shortly via phone or WhatsApp.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  );
}
