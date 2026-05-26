import { motion } from "framer-motion";
import { Award, Microscope, UserCheck, Ambulance, ShieldCheck, Brain } from "lucide-react";

const features = [
  { icon: Award, title: "Experienced Surgeon", desc: "15+ years of dedicated orthopedic and trauma practice." },
  { icon: Microscope, title: "Advanced Treatment", desc: "Modern, evidence-based surgical and non-surgical protocols." },
  { icon: UserCheck, title: "Personalized Care", desc: "Every plan is shaped around your lifestyle and goals." },
  { icon: Ambulance, title: "Emergency Trauma", desc: "Rapid, skilled response for fractures and accidents." },
  { icon: ShieldCheck, title: "Trusted by Patients", desc: "Thousands of patients recommend our care." },
  { icon: Brain, title: "Modern Approach", desc: "Latest research integrated into every treatment." },
];

export default function WhyUs() {
  return (
    <section id="why" className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold tracking-widest uppercase text-accent">Why Choose Us</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-display font-semibold">
            Care you can <span className="gradient-text">trust</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative p-8 rounded-3xl bg-card border border-border shadow-soft hover:shadow-elegant hover:border-accent/40 transition-all duration-500 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 grid place-items-center group-hover:bg-gradient-accent transition-colors">
                  <f.icon className="w-6 h-6 text-accent group-hover:text-accent-foreground transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
