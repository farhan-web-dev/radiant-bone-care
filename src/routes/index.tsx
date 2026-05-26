import { createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Services from "@/components/Services";
import WhyUs from "@/components/WhyUs";
import Appointment from "@/components/Appointment";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import Loader from "@/components/Loader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dr. Abid Ali Khan — Orthopedic & Trauma Surgeon" },
      { name: "description", content: "Dr. Abid Ali Khan — PMDC-registered Orthopedic & Trauma Specialist. Expert care for fractures, joint pain, sports injuries, arthritis and reconstructive surgery." },
      { property: "og:title", content: "Dr. Abid Ali Khan — Orthopedic & Trauma Surgeon" },
      { property: "og:description", content: "Premium orthopedic and trauma care with 15+ years of expertise. Book your appointment today." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <Loader />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Experience />
        <Services />
        <WhyUs />
        <Appointment />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
