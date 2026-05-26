import { motion } from "framer-motion";
import {
  Stethoscope, Bone, Activity, HandHeart, ShieldPlus,
  Dumbbell, Sparkles, ClipboardCheck,
} from "lucide-react";

const services = [
  { icon: Stethoscope, title: "Orthopedic Consultation", desc: "Comprehensive evaluation, diagnostics and personalised care plans." },
  { icon: Bone, title: "Fracture Treatment", desc: "Modern fracture management — casting, fixation and surgical repair." },
  { icon: Activity, title: "Trauma Surgery", desc: "Advanced trauma care for high-impact and complex injuries." },
  { icon: HandHeart, title: "Joint Pain Treatment", desc: "Non-surgical and surgical relief for knee, hip and shoulder pain." },
  { icon: ShieldPlus, title: "Bone & Joint Care", desc: "Long-term care to preserve mobility and prevent recurrence." },
  { icon: Dumbbell, title: "Sports Injury", desc: "Return-to-play protocols for athletes and active individuals." },
  { icon: Sparkles, title: "Arthritis Management", desc: "Multimodal arthritis treatment for long-lasting comfort." },
  { icon: ClipboardCheck, title: "Follow-Up Care", desc: "Structured rehabilitation and recovery follow-up." },
];

export default function Services() {
  return (
    <section id="services" className="relative py-24 lg:py-32 bg-secondary/40">
      <div className="absolute inset-0 gradient-mesh-bg opacity-50 pointer-events-none" />
      <div className="container mx-auto px-6 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold tracking-widest uppercase text-accent">Our Services</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-display font-semibold">
            Comprehensive <span className="gradient-text">orthopedic care</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            From routine consultations to complex trauma surgery — every service is delivered with precision and warmth.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="group relative glass rounded-3xl p-7 shadow-soft hover:shadow-elegant transition-all duration-500 hover:-translate-y-2 overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-accent opacity-0 group-hover:opacity-20 blur-2xl transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-soft group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  <s.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
