import { motion } from "framer-motion";
import { GraduationCap, Briefcase, Heart } from "lucide-react";
import clinicImg from "@/assets/clinic-interior.jpg";


const cards = [
  { icon: GraduationCap, title: "Qualifications", text: "MBBS, FCPS Orthopedics — Trained in fracture, trauma and joint reconstruction." },
  { icon: Briefcase, title: "Experience", text: "15+ years managing complex orthopedic & trauma cases across leading hospitals." },
  { icon: Heart, title: "Patient Care", text: "Personalised treatment plans built on empathy, transparency and recovery outcomes." },
];

export default function About() {
  return (
    <section id="about" className="relative py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-elegant relative bg-gradient-primary">
              {/* Placeholder for clinic / professional image */}
              <div className="absolute inset-0 grid place-items-center text-primary-foreground/80">
                <div className="text-center">
                  <BadgeCheck className="w-16 h-16 mx-auto mb-4 opacity-80" />
                  <p className="text-sm uppercase tracking-widest">Clinic Image Placeholder</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <span className="text-sm font-semibold tracking-widest uppercase text-accent">About the Doctor</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-display font-semibold text-foreground">
              A surgeon devoted to <span className="gradient-text">movement & recovery.</span>
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              Dr. Abid Ali Khan is a PMDC-registered Orthopedic &amp; Trauma Specialist with
              deep expertise in fractures, bone injuries, joint pain, trauma care and reconstructive
              orthopedic surgery. He blends modern surgical techniques with personalised
              rehabilitation to bring patients back to an active life.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {cards.map((c, i) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-5 shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-all"
                >
                  <c.icon className="w-6 h-6 text-accent mb-3" />
                  <div className="font-display font-semibold text-foreground">{c.title}</div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{c.text}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 pt-6 border-t border-border">
              <div className="font-display italic text-2xl text-primary">— Dr. Abid Ali Khan</div>
              <div className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Orthopedic & Trauma Specialist</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
