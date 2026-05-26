import { motion } from "framer-motion";
import { Calendar, Phone, Award, Users, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import doctorImg from "@/assets/doctor-hero.jpg";

const stats = [
  { icon: Award, value: "15+", label: "Years Experience" },
  { icon: HeartPulse, value: "5,000+", label: "Successful Surgeries" },
  { icon: Users, value: "20,000+", label: "Happy Patients" },
];

export default function Hero() {
  return (
    <section id="home" className="relative min-h-screen pt-28 pb-16 overflow-hidden gradient-hero-bg">
      {/* mesh + floating shapes */}
      <div className="absolute inset-0 gradient-mesh-bg pointer-events-none" />
      <motion.div
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-32 -left-20 w-80 h-80 rounded-full bg-accent/20 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 right-0 w-96 h-96 rounded-full bg-primary/20 blur-3xl"
      />

      <div className="container mx-auto px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium tracking-wide uppercase text-foreground/70">
                PMDC Registered • Available Today
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-semibold leading-[1.05] text-foreground">
              Expert <span className="gradient-text">Orthopedic</span> & Trauma Care
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              <span className="font-semibold text-foreground">Dr. Abid Ali Khan</span> — Assistant Professor 
              and Consultant Orthopaedic &amp; Trauma Surgeon. Expert care for fractures, joint pain, 
              limb reconstruction, and trauma recovery.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-full px-7 shadow-elegant">
                <a href="#appointment"><Calendar className="w-4 h-4 mr-2" /> Book Appointment</a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-7 border-2 border-primary/20 hover:bg-primary/5">
                <a href="#contact"><Phone className="w-4 h-4 mr-2" /> Contact Now</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-4">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="glass rounded-2xl p-4 shadow-soft"
                >
                  <s.icon className="w-5 h-5 text-accent mb-2" />
                  <div className="text-2xl font-display font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - doctor image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-accent rounded-[3rem] rotate-3 opacity-30 blur-2xl" />
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-elegant border-4 border-background">
              <img
                src={doctorImg}
                alt="Dr. Abid Ali Khan, Orthopedic Surgeon"
                width={1024}
                height={1024}
                className="w-full h-auto object-cover"
              />
            </div>
            {/* floating badge */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -bottom-6 -left-6 glass-strong rounded-2xl p-4 shadow-elegant max-w-[200px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-accent grid place-items-center">
                  <HeartPulse className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Trusted by</div>
                  <div className="font-display font-bold">20K+ Patients</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
