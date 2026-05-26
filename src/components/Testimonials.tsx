import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";

const reviews = [
  { name: "Ayesha R.", role: "Knee Replacement Patient", text: "Dr. Abid restored my mobility after years of pain. His care was thorough, kind, and the surgery outcome exceeded my expectations." },
  { name: "Muhammad Imran", role: "Fracture Recovery", text: "After my road accident, his team handled my trauma with skill and warmth. I'm walking pain-free today thanks to him." },
  { name: "Sana Tariq", role: "Sports Injury", text: "As an athlete I was worried about returning to play. Dr. Abid's rehab plan got me back on the field stronger than before." },
  { name: "Omar Sheikh", role: "Arthritis Treatment", text: "The personalised treatment plan completely changed my quality of life. Highly professional and deeply compassionate." },
];

export default function Testimonials() {
  const [i, setI] = useState(0);
  const r = reviews[i];

  return (
    <section id="testimonials" className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh-bg opacity-40" />
      <div className="container mx-auto px-6 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-sm font-semibold tracking-widest uppercase text-accent">Patient Stories</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-display font-semibold">
            Voices of <span className="gradient-text">recovery</span>
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative glass-strong rounded-3xl p-10 md:p-14 shadow-elegant">
            <Quote className="absolute top-6 left-6 w-12 h-12 text-accent/20" />

            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex gap-1 mb-6 justify-center">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="w-5 h-5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-lg md:text-xl text-foreground leading-relaxed text-center font-display italic">
                  "{r.text}"
                </p>
                <div className="mt-8 text-center">
                  <div className="font-semibold text-foreground">{r.name}</div>
                  <div className="text-sm text-muted-foreground">{r.role}</div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => setI((i - 1 + reviews.length) % reviews.length)}
                className="w-11 h-11 rounded-full glass grid place-items-center hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                {reviews.map((_, k) => (
                  <button
                    key={k}
                    onClick={() => setI(k)}
                    className={`h-2 rounded-full transition-all ${k === i ? "w-8 bg-accent" : "w-2 bg-muted-foreground/30"}`}
                    aria-label={`Slide ${k + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setI((i + 1) % reviews.length)}
                className="w-11 h-11 rounded-full glass grid place-items-center hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
