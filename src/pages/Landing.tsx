import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, FileText, Youtube, Globe, ArrowRight, Check, Star, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import heroImage from "@/assets/hero-illustration.png";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
];

const features = [
  { icon: Youtube, title: "YouTube Videos", desc: "Paste any YouTube link and get an instant AI summary of the full transcript." },
  { icon: Globe, title: "Articles & Blogs", desc: "Summarize any web article in seconds. Just paste the URL." },
  { icon: FileText, title: "PDF Documents", desc: "Upload PDFs and extract key insights with AI-powered analysis." },
  { icon: Zap, title: "Multiple Formats", desc: "Get summaries as bullet points, study notes, mindmaps, or Twitter threads." },
];

const plans = [
  {
    name: "Free",
    price: "R$0",
    period: "",
    credits: "3 credits/day",
    features: ["1 video/day", "1 PDF/day", "1 article/day", "3 summary formats"],
    popular: false,
    cta: "Start Free",
  },
  {
    name: "Starter",
    price: "R$14",
    period: ".90/mo",
    credits: "10 credits/day",
    features: ["2 videos/day", "2 PDFs/day", "2 articles/day", "6 summary formats", "Referral bonuses"],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "R$29",
    period: ".90/mo",
    credits: "25 credits/day",
    features: ["5 videos/day", "5 PDFs/day", "5 articles/day", "All 12 formats", "Priority AI", "Analytics dashboard"],
    popular: true,
    cta: "Go Pro",
  },
  {
    name: "Annual Pro",
    price: "R$149",
    period: "/year",
    credits: "100 credits/day",
    features: ["Unlimited content", "All features", "VIP support", "Affiliate program", "20% off add-ons"],
    popular: false,
    cta: "Best Value",
  },
];

const testimonials = [
  { name: "Lucas M.", role: "Student", text: "Economizei 10h por semana nos meus estudos! O modo estudo é incrível.", stars: 5 },
  { name: "Ana C.", role: "Content Creator", text: "I summarize 20+ YouTube videos daily. Snapysummary is a game changer.", stars: 5 },
  { name: "Pedro R.", role: "Entrepreneur", text: "Consigo acompanhar tendências de mercado em minutos. Vale cada centavo!", stars: 5 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Snapysummary</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/auth">Log in</Link></Button>
            <Button asChild><Link to="/auth?tab=signup">Start Free <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-t border-border bg-background p-4 space-y-3">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="block text-sm font-medium text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" asChild><Link to="/auth">Log in</Link></Button>
              <Button className="flex-1" asChild><Link to="/auth?tab=signup">Start Free</Link></Button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 gradient-hero">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Zap className="h-3.5 w-3.5" /> AI-Powered Summaries
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Transform Hours of Content into{" "}
              <span className="text-gradient">Minutes of Knowledge</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Snapysummary uses powerful AI to instantly summarize YouTube videos, articles, and PDFs. Save time and learn faster.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 shadow-glow" asChild>
                <Link to="/auth?tab=signup">Try Free — No Card Required <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <a href="#features">See How It Works</a>
              </Button>
            </motion.div>
            <motion.p variants={fadeUp} className="text-sm text-muted-foreground mt-4">
              10,000+ summaries generated · Loved by students & creators
            </motion.p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="mt-16 max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
              <img src={heroImage} alt="Snapysummary AI summarization dashboard preview" className="w-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Learn Faster
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Summarize any content type in the format that works best for you.
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="group rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 gradient-card">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 gradient-hero">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
              Start free. Upgrade when you need more power.
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                className={`rounded-2xl border p-6 flex flex-col bg-card ${plan.popular ? "border-primary shadow-glow ring-2 ring-primary/20 relative" : "border-border"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.credits}</p>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.popular ? "default" : "outline"} className="w-full" asChild>
                  <Link to="/auth?tab=signup">{plan.cta}</Link>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Loved by Thousands
            </motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUp} className="rounded-2xl border border-border p-6 gradient-card">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Save Hours Every Week?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join 10,000+ users who learn faster with Snapysummary. Start free today.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button size="lg" className="text-base px-8 shadow-glow" asChild>
                <Link to="/auth?tab=signup">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-semibold">Snapysummary</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 Snapysummary. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
