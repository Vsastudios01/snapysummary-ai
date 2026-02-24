import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, FileText, Youtube, Globe, ArrowRight, Check, Star, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import heroImage from "@/assets/hero-illustration.png";

const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Preços", href: "#pricing" },
  { label: "Depoimentos", href: "#testimonials" },
];

const features = [
  { icon: Youtube, title: "Vídeos do YouTube", desc: "Cole qualquer link do YouTube e obtenha um resumo instantâneo com IA." },
  { icon: Globe, title: "Artigos e Blogs", desc: "Resuma qualquer artigo da web em segundos. Basta colar a URL." },
  { icon: FileText, title: "Documentos PDF", desc: "Envie PDFs e extraia insights com análise inteligente por IA." },
  { icon: Zap, title: "Múltiplos Formatos", desc: "Resumos em tópicos, notas de estudo, mapas mentais ou threads do Twitter." },
];

const plans = [
  {
    name: "Grátis",
    price: "R$0",
    period: "",
    credits: "3 créditos/dia",
    features: ["1 vídeo/dia", "1 PDF/dia", "1 artigo/dia", "3 formatos de resumo"],
    popular: false,
    cta: "Começar Grátis",
  },
  {
    name: "Starter",
    price: "R$14",
    period: ",90/mês",
    credits: "10 créditos/dia",
    features: ["2 vídeos/dia", "2 PDFs/dia", "2 artigos/dia", "6 formatos de resumo", "Bônus por indicação"],
    popular: false,
    cta: "Começar Agora",
  },
  {
    name: "Pro",
    price: "R$29",
    period: ",90/mês",
    credits: "25 créditos/dia",
    features: ["5 vídeos/dia", "5 PDFs/dia", "5 artigos/dia", "Todos os 12 formatos", "IA prioritária", "Painel de análises"],
    popular: true,
    cta: "Assinar Pro",
  },
  {
    name: "Pro Anual",
    price: "R$149",
    period: "/ano",
    credits: "100 créditos/dia",
    features: ["Conteúdo ilimitado", "Todas as funcionalidades", "Suporte VIP", "Programa de afiliados", "20% de desconto em extras"],
    popular: false,
    cta: "Melhor Valor",
  },
];

const testimonials = [
  { name: "Lucas M.", role: "Estudante", text: "Economizei 10h por semana nos meus estudos! O modo estudo é incrível.", stars: 5 },
  { name: "Ana C.", role: "Criadora de Conteúdo", text: "Resumo mais de 20 vídeos do YouTube por dia. O Snapysummary é revolucionário.", stars: 5 },
  { name: "Pedro R.", role: "Empreendedor", text: "Consigo acompanhar tendências de mercado em minutos. Vale cada centavo!", stars: 5 },
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
            <Button variant="ghost" asChild><Link to="/auth">Entrar</Link></Button>
            <Button asChild><Link to="/auth?tab=signup">Começar Grátis <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
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
              <Button variant="ghost" className="flex-1" asChild><Link to="/auth">Entrar</Link></Button>
              <Button className="flex-1" asChild><Link to="/auth?tab=signup">Começar Grátis</Link></Button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 gradient-hero">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Zap className="h-3.5 w-3.5" /> Resumos com IA
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Transforme Horas de Conteúdo em{" "}
              <span className="text-gradient">Minutos de Conhecimento</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              O Snapysummary usa IA avançada para resumir instantaneamente vídeos do YouTube, artigos e PDFs. Economize tempo e aprenda mais rápido.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 shadow-glow" asChild>
                <Link to="/auth?tab=signup">Teste Grátis — Sem Cartão <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <a href="#features">Veja Como Funciona</a>
              </Button>
            </motion.div>
            <motion.p variants={fadeUp} className="text-sm text-muted-foreground mt-4">
              10.000+ resumos gerados · Amado por estudantes e criadores
            </motion.p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="mt-16 max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
              <img src={heroImage} alt="Prévia do painel de resumos com IA do Snapysummary" className="w-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo Que Você Precisa Para Aprender Mais Rápido
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Resuma qualquer tipo de conteúdo no formato que funciona melhor para você.
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
              Preços Simples e Transparentes
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
              Comece grátis. Faça upgrade quando precisar de mais.
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
                    Mais Popular
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
              Amado por Milhares
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
              Pronto Para Economizar Horas Toda Semana?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Junte-se a mais de 10.000 usuários que aprendem mais rápido com o Snapysummary. Comece grátis hoje.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button size="lg" className="text-base px-8 shadow-glow" asChild>
                <Link to="/auth?tab=signup">Começar Grátis <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
              <a href="#" className="hover:text-foreground transition-colors">Termos</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Contato</a>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 Snapysummary. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
