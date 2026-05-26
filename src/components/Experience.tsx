import { motion } from "framer-motion";
import { Award, MapPin, CheckCircle2, ShieldCheck, Building2 } from "lucide-react";
import pimsLogo from "@/assets/pims-logo.png";
import ayubLogo from "@/assets/ayub-logo.png";

const experiences = [
  {
    role: "Ex-President & General Surgeon",
    hospital: "Pakistan Institute of Medical Sciences (PIMS)",
    location: "Islamabad, Pakistan",
    logo: pimsLogo,
    badge: "Clinical Leadership",
    highlights: [
      "Department Leadership: Headed administrative & clinical surgery operations, setting exceptional standards of care.",
      "Complex Trauma & Surgery: Specialized in advanced general, emergency, and trauma surgical procedures.",
      "Residency Mentorship: Formulated training curriculums and mentored hundreds of surgical residents and fellows.",
      "Quality Governance: Led internal medical boards to improve surgical safety and clinical outcomes."
    ]
  },
  {
    role: "Ex-President & Orthopaedic Surgeon",
    hospital: "Ayub Medical Complex",
    location: "Abbottabad, Pakistan",
    logo: ayubLogo,
    badge: "Orthopaedic Excellence",
    highlights: [
      "Orthopaedic Division Head: Orchestrated the orthopaedic and joint reconstructive department's growth.",
      "Trauma Specialist: Spearheaded emergency bone and joint trauma interventions for complex fracture cases.",
      "Academic Leadership: Conducted advanced research programs and clinical symposiums for orthopedic surgeons.",
      "Patient Recovery Advocacy: Structured comprehensive post-surgical rehabilitation guidelines for bone healing."
    ]
  }
];

export default function Experience() {
  return (
    <section id="experience" className="relative py-24 lg:py-32 overflow-hidden bg-muted/30">
      {/* Background soft mesh decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-accent-glow)_0px,_transparent_70%)] opacity-30" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,_var(--color-primary-glow)_0px,_transparent_70%)] opacity-20" />

      <div className="container mx-auto px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.span
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-semibold tracking-widest uppercase text-accent bg-accent/10 px-4 py-1.5 rounded-full border border-accent/20"
          >
            Clinical Leadership
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-5 text-4xl md:text-5xl font-display font-semibold leading-tight text-foreground"
          >
            Distinguished <span className="gradient-text">Medical Leadership</span> &amp; Experience
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-muted-foreground text-lg leading-relaxed"
          >
            A legacy of excellence in surgical innovation, administrative leadership, and 
            academic mentorship at Pakistan's premier medical complexes.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {experiences.map((exp, index) => (
            <motion.div
              key={exp.hospital}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.15 }}
              className="glass rounded-3xl p-8 lg:p-10 shadow-soft hover:shadow-elegant hover:border-accent/40 transition-all duration-500 relative group flex flex-col justify-between"
            >
              {/* Decorative accent top line */}
              <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-primary to-accent rounded-b-full opacity-60 group-hover:opacity-100 transition-opacity" />

              <div>
                {/* Header Section: Logo + Title */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-border">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-soft border border-border p-2 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-500">
                    <img
                      src={exp.logo}
                      alt={`${exp.hospital} Logo`}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-accent mb-2">
                      <Award className="w-3.5 h-3.5" />
                      {exp.badge}
                    </span>
                    <h3 className="font-display text-2xl font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
                      {exp.role}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary/60" />
                      {exp.hospital}
                    </p>
                  </div>
                </div>

                {/* Location & Metadata info */}
                <div className="py-4 flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground/80">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-accent" />
                    {exp.location}
                  </span>
                  <span className="flex items-center gap-1 bg-primary/5 px-2.5 py-1 rounded-md text-primary">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Senior Consultant &amp; Former President
                  </span>
                </div>

                {/* Role Highlights */}
                <div className="mt-4 space-y-3.5">
                  <p className="text-sm font-semibold text-foreground/90 uppercase tracking-wider">
                    Key Achievements &amp; Contributions
                  </p>
                  <ul className="space-y-3">
                    {exp.highlights.map((highlight, idx) => {
                      const [title, desc] = highlight.split(": ");
                      return (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          <p className="text-muted-foreground leading-relaxed">
                            <strong className="text-foreground font-medium">{title}:</strong> {desc}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
