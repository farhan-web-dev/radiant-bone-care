import { Stethoscope, Facebook, Instagram, Linkedin, Phone, Mail, MapPin } from "lucide-react";

const quick = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

const services = [
  "Fracture Treatment", "Trauma Surgery", "Joint Pain", "Sports Injury", "Arthritis Management",
];

export default function Footer() {
  return (
    <footer className="relative bg-primary text-primary-foreground pt-20 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent grid place-items-center">
                <Stethoscope className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="font-display text-lg font-semibold">Dr. Abid Ali Khan</div>
            </div>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              Specialist in Orthopedic Surgery, Trauma, and Bone &amp; Joint Care. PMDC Registered.
            </p>
            <div className="flex gap-3 mt-5">
              {[Facebook, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-full border border-primary-foreground/20 grid place-items-center hover:bg-accent hover:border-accent transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              {quick.map((q) => (
                <li key={q.href}><a href={q.href} className="hover:text-accent transition-colors">{q.label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              {services.map((s) => (
                <li key={s}><a href="#services" className="hover:text-accent transition-colors">{s}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex gap-2"><Phone className="w-4 h-4 mt-0.5 text-accent" /> 0348-8100374</li>
              <li className="flex gap-2"><Phone className="w-4 h-4 mt-0.5 text-accent" /> 0345-3111297</li>
              <li className="flex gap-2"><Mail className="w-4 h-4 mt-0.5 text-accent" /> info@drabidalikhan.com</li>
              <li className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 text-accent" /> Clinic Address Placeholder</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-primary-foreground/15 text-center text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Dr. Abid Ali Khan. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
