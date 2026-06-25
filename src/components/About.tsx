import { motion } from "framer-motion";
import { GraduationCap, Briefcase, Heart } from "lucide-react";
import clinicImg from "@/assets/clinic-interior.jpg";

const cards = [
  { 
    icon: GraduationCap, 
    title: "Qualifications", 
    text: "MBBS (Pb), FCPS (Ortho. Surgery), IMM (Gen. Surgery), FIAS, Fellowship Ilizarov, Certified AO Trauma." 
  },
  { 
    icon: Briefcase, 
    title: "Experience", 
    text: "Assistant Professor & Consultant Orthopaedic Surgeon with 15+ years of clinical and academic leadership." 
  },
  { 
    icon: Heart, 
    title: "Patient Care", 
    text: "Personalised treatment plans built on empathy, transparency and surgical recovery outcomes." 
  },
];

const degrees = [
  { name: "MBBS (DWO)", label: "Bachelor of Medicine & Surgery" },
  { name: "FCPS (Ortho. Surgery)", label: "Fellowship of College of Physicians & Surgeons" },
  { name: "IMM (Gen. Surgery)", label: "Intermediate Module in General Surgery" },
  { name: "FIAS (Pakistan)", label: "Fellow of International Association of Surgeons" },
  { name: "Fellowship Ilizarov", label: "Specialist in Advanced Reconstructive Surgery" },
  { name: "Certified AO-Trauma", label: "Global Standard in Fracture & Trauma Care" },
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
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-elegant relative">
              <img
                src={clinicImg}
                alt="Dr. Abid Ali Khan's modern orthopedic clinic interior"
                width={1024}
                height={1280}
                loading="lazy"
                className="w-full h-full object-cover"
              />
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
              Dr. Abid Ali Khan is an **Assistant Professor** and PMDC-registered **Consultant Orthopaedic &amp; Trauma Surgeon**. 
              With deep clinical expertise in complex fractures, bone injuries, joint pain, limb reconstructive surgery, and trauma care, 
              he blends international medical standards with compassionate rehabilitation to help patients regain full mobility.
            </p>

            {/* Degrees & Board Certifications Grid */}
            <div className="mt-8">
              <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-widest mb-4">Board Certifications &amp; Degrees</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {degrees.map((deg, i) => (
                  <motion.div
                    key={deg.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="glass rounded-xl p-3 shadow-soft border border-border/80 hover:border-accent/30 transition-all flex flex-col justify-between"
                  >
                    <span className="text-xs font-bold text-primary font-sans leading-tight">{deg.name}</span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-1 leading-tight">{deg.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>

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
              <div className="text-xs text-muted-foreground mt-1 tracking-widest uppercase font-semibold">
                Assistant Professor &amp; Consultant Orthopaedic Surgeon
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
