import { motion } from "framer-motion";
import { Phone, MessageCircle, Mail, MapPin, Facebook, Instagram, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

const phones = [
  { label: "Reception", number: "0348-8100374" },
  { label: "Direct Line", number: "0345-3111297" },
  { label: "Appointments", number: "0348-5661687" },
];

export default function Contact() {
  return (
    <section id="contact" className="py-24 lg:py-32 bg-secondary/40">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold tracking-widest uppercase text-accent">Get in Touch</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-display font-semibold">
            We're here to <span className="gradient-text">help</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {phones.map((p, i) => (
            <motion.div
              key={p.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-3xl p-6 shadow-soft hover:shadow-elegant transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-accent grid place-items-center mb-4">
                <Phone className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{p.label}</div>
              <a href={`tel:${p.number}`} className="block mt-1 text-2xl font-display font-semibold text-foreground hover:text-accent">
                {p.number}
              </a>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-strong rounded-3xl p-8 shadow-soft"
          >
            <h3 className="font-display text-2xl font-semibold mb-6">Quick Actions</h3>
            <div className="space-y-4">
              <Button asChild className="w-full justify-start bg-gradient-primary text-primary-foreground rounded-2xl h-14 hover:opacity-90">
                <a href="tel:03485661687"><Phone className="w-5 h-5 mr-3" /> Call Now</a>
              </Button>
              <Button asChild className="w-full justify-start rounded-2xl h-14 bg-[#25D366] text-white hover:opacity-90">
                <a href="https://wa.me/923485661687" target="_blank" rel="noreferrer"><MessageCircle className="w-5 h-5 mr-3" /> WhatsApp Chat</a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start rounded-2xl h-14 border-2">
                <a href="mailto:info@drabidalikhan.com"><Mail className="w-5 h-5 mr-3" /> info@drabidalikhan.com</a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start rounded-2xl h-auto py-3 border-2 hover:bg-primary/5 hover:text-primary transition-all duration-300 whitespace-normal text-left">
                <a 
                  href="https://maps.google.com/?q=Basham+Plaza+opposite+King+Abdullah+Teaching+Hospital+Mansehra" 
                  target="_blank" 
                  rel="noreferrer"
                >
                  <MapPin className="w-5 h-5 mr-3 text-accent flex-shrink-0" /> 
                  <span>Basham Plaza opposite to King Abdullah Teaching Hospital, Mansehra</span>
                </a>
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Follow us</span>
              {[Facebook, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full bg-card border border-border grid place-items-center hover:bg-gradient-primary hover:text-primary-foreground hover:border-transparent transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl overflow-hidden shadow-elegant min-h-[400px] bg-card border border-border relative group"
          >
            <iframe
              title="Basham Plaza opposite King Abdullah Teaching Hospital, Mansehra Map"
              src="https://maps.google.com/maps?q=Basham%20Plaza%20opposite%20King%20Abdullah%20Teaching%20Hospital%20Mansehra&t=&z=16&ie=UTF8&iwloc=&output=embed"
              className="w-full h-full min-h-[400px] border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
