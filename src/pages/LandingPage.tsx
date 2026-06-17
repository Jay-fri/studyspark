import { useRef } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { WetPaintButton } from "@/components/ui/WetPaintButton";
import { getLastPath } from "@/components/auth/AuthGuard";
import { motion, useInView } from "framer-motion";
import {
  MessageSquare,
  FileText,
  BookOpen,
  Brain,
  Network,
  Library,
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Sparkles,
} from "@/lib/icons";
import { TOKEN_PACKAGES } from "@/types";

const MINT = "#38E0C3";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = (d = 0.08) => ({ hidden: {}, show: { transition: { staggerChildren: d } } });

function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} variants={stagger()} initial="hidden" animate={inView ? "show" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

const FEATURES = [
  { icon: MessageSquare, title: "AI Chat", desc: "Ask questions about your notes and get instant, accurate answers — like a tutor who read your textbook." },
  { icon: FileText,      title: "Smart Summaries", desc: "Upload any PDF or document and get a structured, easy-to-revise summary in seconds." },
  { icon: BookOpen,      title: "Flashcards", desc: "AI-generated flashcards with spaced repetition so you focus on what you don't know yet." },
  { icon: Brain,         title: "Practice Quizzes", desc: "Multiple-choice quizzes with explanations — test yourself before the real exam." },
  { icon: Network,       title: "Mind Maps", desc: "Visualise connections between concepts with automatically generated mind maps." },
  { icon: Library,       title: "Study Library", desc: "All your notebooks, sources, and AI outputs — searchable and organised in one place." },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Upload your materials",
    desc: "PDFs, Word docs, or paste text — StudyLM indexes every word instantly.",
    chips: ["PDF", "DOCX", "TXT", "PPTX"],
  },
  {
    n: "02",
    title: "Pick your study mode",
    desc: "Generate summaries, quizzes, flashcards, or mind maps — all from one upload.",
    chips: ["Summary", "Quiz", "Cards", "Map"],
  },
  {
    n: "03",
    title: "Ace every exam",
    desc: "Spaced-repetition tracks what you know. AI review flags every weak spot.",
    chips: ["14-day streak", "78% avg grade ↑"],
  },
];

const TESTIMONIALS = [
  { name: "Adaeze O.", uni: "University of Lagos", text: "I went from spending 4 hours making notes to 20 minutes. StudyLM is genuinely insane for exam prep.", stars: 5 },
  { name: "Emeka T.", uni: "Covenant University", text: "The quiz feature caught gaps in my knowledge I didn't even know I had. Got 78% in Pharmacology.", stars: 5 },
  { name: "Fatimah A.", uni: "Ahmadu Bello University", text: "I upload my lecture slides and immediately get flashcards. My GPA jumped a full point this semester.", stars: 5 },
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user, isLoading } = useAuthStore();
  if (!isLoading && user) return <Navigate to={getLastPath()} replace />;
  return (
    <div className="min-h-dvh overflow-x-hidden" style={{ background: "#0a1628", color: "rgba(255,255,255,0.88)" }}>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const navigate = useNavigate();
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 inset-x-0 z-50"
      style={{
        background: "rgba(10,22,40,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="StudyLM" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-display text-[15px]" style={{ color: "rgba(255,255,255,0.92)" }}>StudyLM</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "rgba(255,255,255,0.42)" }}>
          {["Features", "How it works", "Pricing"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(" ", "-")}`}
              className="transition-colors duration-150"
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.42)")}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            to="/auth"
            className="text-sm transition-colors duration-150"
            style={{ color: "rgba(255,255,255,0.42)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.42)")}
          >
            Sign in
          </Link>
          <WetPaintButton onClick={() => navigate("/auth?tab=signup")} className="px-4 py-2 text-sm">
            Get started
          </WetPaintButton>
        </div>
      </div>
    </motion.nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const navigate = useNavigate();
  return (
    <section className="relative pb-28 px-6 overflow-hidden" style={{ paddingTop: "calc(10rem + env(safe-area-inset-top, 0px))" }}>
      {/* Orbs */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute rounded-full" style={{ width: 500, height: 500, background: "rgba(56,224,195,0.09)", filter: "blur(90px)", top: -160, left: -100 }} />
        <div className="absolute rounded-full" style={{ width: 380, height: 380, background: "rgba(99,179,255,0.05)", filter: "blur(80px)", top: "30%", right: -80 }} />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{ background: "rgba(56,224,195,0.07)", border: "0.5px solid rgba(56,224,195,0.2)", color: "rgba(56,224,195,0.85)" }}
        >
          <Zap className="w-3 h-3" style={{ color: MINT }} />
          Powered by Llama 3.3 70B via Groq
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="text-5xl md:text-7xl font-display leading-[1.04] tracking-tight mb-6"
          style={{ color: "rgba(255,255,255,0.95)" }}
        >
          Study{" "}
          <span style={{ color: MINT }}>Smarter</span>,
          <br />
          Not Harder
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.28 }}
          className="text-lg max-w-xl mx-auto mb-10 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.48)" }}
        >
          Upload your lecture notes. StudyLM's AI turns them into summaries, flashcards,
          quizzes, and mind maps — study the material, not the act of making notes.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <WetPaintButton onClick={() => navigate("/auth?tab=signup")} className="flex items-center gap-2 px-7 py-3.5 text-base">
            Get started free
            <ArrowRight className="w-4 h-4" />
          </WetPaintButton>
          <a
            href="#features"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.07)"; el.style.color = "rgba(255,255,255,0.85)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.color = "rgba(255,255,255,0.55)"; }}
          >
            See features
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-5 text-xs"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          1,000 free tokens on signup · No credit card required
        </motion.p>
      </div>

      {/* App preview */}
      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.85, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-20 max-w-4xl mx-auto"
      >
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(17,29,48,0.9)", border: "0.5px solid rgba(255,255,255,0.09)", backdropFilter: "blur(16px)" }}>
          {/* Browser bar */}
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(255,255,255,0.025)", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div className="flex gap-1.5">
              {["rgba(239,68,68,0.45)", "rgba(245,158,11,0.45)", "rgba(34,197,94,0.45)"].map((c, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <div className="flex-1 mx-4 px-3 py-0.5 rounded-md text-xs text-center truncate" style={{ background: "rgba(255,255,255,0.035)", border: "0.5px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.28)" }}>
              studylm.app/notebook/pharmacology
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-4 h-60 md:h-72">
            {/* Sidebar */}
            <div className="col-span-1 hidden md:flex flex-col gap-1 p-3" style={{ borderRight: "0.5px solid rgba(255,255,255,0.07)" }}>
              {["📚 Pharmacology", "🧬 Biochemistry", "📐 Statistics"].map((item, i) => (
                <div key={item} className="text-xs px-2.5 py-1.5 rounded-lg" style={i === 0 ? { background: "rgba(56,224,195,0.08)", border: "0.5px solid rgba(56,224,195,0.18)", color: MINT } : { color: "rgba(255,255,255,0.32)" }}>
                  {item}
                </div>
              ))}
            </div>

            {/* Main */}
            <div className="col-span-4 md:col-span-3 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(56,224,195,0.1)", border: "0.5px solid rgba(56,224,195,0.2)" }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: MINT }} />
                </div>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.88)" }}>AI Summary — Pharmacology Unit 3</div>
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.32)" }}>Generated in 2.4s · 47 tokens</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {[90, 76, 84, 62, 78].map((w, i) => (
                  <div key={i} className="rounded-full" style={{ height: 7, width: `${w}%`, background: i === 0 ? "rgba(56,224,195,0.22)" : "rgba(255,255,255,0.07)" }} />
                ))}
              </div>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {["Summary", "Quiz", "Flashcards", "Mind Map"].map((tab, i) => (
                  <div key={tab} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={i === 0 ? { background: "rgba(56,224,195,0.1)", border: "0.5px solid rgba(56,224,195,0.22)", color: MINT } : { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.38)" }}>
                    {tab}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="features" className="py-24 px-6" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-14">
          <motion.p variants={fadeUp} className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: "rgba(56,224,195,0.6)" }}>
            Features
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-display" style={{ color: "rgba(255,255,255,0.93)" }}>
            Everything you need to ace your exams
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-lg mx-auto text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
            From first upload to final revision — StudyLM handles the busywork so you can focus on actually understanding.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="relative p-6 rounded-xl overflow-hidden transition-all duration-150"
              style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)" }}
              onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = "rgba(56,224,195,0.025)"; el.style.borderColor = "rgba(56,224,195,0.18)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "rgba(255,255,255,0.03)"; el.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              {/* Ghost index number */}
              <span
                className="absolute font-display leading-none select-none pointer-events-none"
                style={{ fontSize: 88, color: "rgba(56,224,195,0.04)", top: -8, right: 10, lineHeight: 1 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <f.icon className="w-[18px] h-[18px] mb-4 relative" style={{ color: "rgba(56,224,195,0.75)" }} />
              <h3 className="text-[13px] font-medium mb-1.5 relative" style={{ color: "rgba(255,255,255,0.9)" }}>
                {f.title}
              </h3>
              <p className="text-[12.5px] leading-relaxed relative" style={{ color: "rgba(255,255,255,0.4)" }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", borderBottom: "0.5px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
      <div className="max-w-5xl mx-auto">
        <AnimatedSection className="text-center mb-14">
          <motion.p variants={fadeUp} className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: "rgba(56,224,195,0.6)" }}>
            How it works
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-display" style={{ color: "rgba(255,255,255,0.93)" }}>
            Three steps to exam-ready
          </motion.h2>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-3 gap-10">
          {STEPS.map((step) => (
            <motion.div key={step.n} variants={fadeUp}>
              {/* Step number */}
              <div className="mb-5">
                <span className="font-display" style={{ fontSize: 42, lineHeight: 1, color: "rgba(56,224,195,0.55)", letterSpacing: "-0.02em" }}>
                  {step.n}
                </span>
                <div className="mt-2" style={{ height: "0.5px", width: 32, background: "rgba(56,224,195,0.3)" }} />
              </div>

              <h3 className="text-base font-medium mb-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                {step.title}
              </h3>
              <p className="text-[13px] leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.42)" }}>
                {step.desc}
              </p>

              {/* Context chips */}
              <div className="flex flex-wrap gap-1.5">
                {step.chips.map((chip) => (
                  <span
                    key={chip}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                    style={{ background: "rgba(56,224,195,0.07)", border: "0.5px solid rgba(56,224,195,0.18)", color: "rgba(56,224,195,0.8)" }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing() {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <AnimatedSection className="text-center mb-14">
          <motion.p variants={fadeUp} className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: "rgba(56,224,195,0.6)" }}>
            Pricing
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-display" style={{ color: "rgba(255,255,255,0.93)" }}>
            Pay only for what you use
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4" style={{ color: "rgba(255,255,255,0.42)", fontSize: 15 }}>
            Start free. Top up tokens when you need them. No subscriptions.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Free tier */}
          <motion.div variants={fadeUp} className="p-8 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.09)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              Free
            </p>
            <div className="flex items-end gap-1.5 mb-2">
              <span className="text-5xl font-display" style={{ color: "rgba(255,255,255,0.93)" }}>1,000</span>
              <span className="mb-2 text-sm" style={{ color: "rgba(255,255,255,0.42)" }}>tokens</span>
            </div>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.42)" }}>
              On every new account — no credit card needed.
            </p>
            <ul className="space-y-3 mb-8">
              {["AI Chat", "Summaries", "Quiz & Flashcards", "Mind Maps", "1 notebook"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "rgba(56,224,195,0.7)" }} />
                  {f}
                </li>
              ))}
            </ul>
            <WetPaintButton onClick={() => navigate("/auth?tab=signup")} className="w-full justify-center">
              Get started free
            </WetPaintButton>
          </motion.div>

          {/* Token packs */}
          <motion.div variants={fadeUp} className="space-y-3">
            {TOKEN_PACKAGES.map((pkg) => (
              <div
                key={pkg.label}
                className="relative p-5 rounded-xl transition-all duration-150"
                style={{
                  background: pkg.popular ? "rgba(56,224,195,0.04)" : "rgba(255,255,255,0.025)",
                  border: pkg.popular ? "0.5px solid rgba(56,224,195,0.28)" : "0.5px solid rgba(255,255,255,0.07)",
                }}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: MINT }}>
                    Most popular
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[14px]" style={{ color: "rgba(255,255,255,0.9)" }}>{pkg.label}</p>
                    <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.42)" }}>{pkg.tokens.toLocaleString()} tokens</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-display" style={{ color: "rgba(255,255,255,0.9)" }}>₦{pkg.price_ngn.toLocaleString()}</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.32)" }}>₦{((pkg.price_ngn / pkg.tokens) * 1000).toFixed(0)} / 1k tokens</p>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[11px] pt-2 text-center" style={{ color: "rgba(255,255,255,0.28)" }}>
              Tokens never expire · Pay once, use whenever
            </p>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="py-24 px-6" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
      <div className="max-w-5xl mx-auto">
        <AnimatedSection className="text-center mb-14">
          <motion.p variants={fadeUp} className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: "rgba(56,224,195,0.6)" }}>
            Testimonials
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-display" style={{ color: "rgba(255,255,255,0.93)" }}>
            Students love StudyLM
          </motion.h2>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="p-6 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5" style={{ fill: "#F59E0B", color: "#F59E0B" }} />
                ))}
              </div>
              <p className="text-[13px] leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                "{t.text}"
              </p>
              <div>
                <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.88)" }}>{t.name}</p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.32)" }}>{t.uni}</p>
              </div>
            </motion.div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function CTA() {
  const navigate = useNavigate();
  return (
    <section className="py-32 px-6 relative overflow-hidden" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
      {/* Centred radial mint glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 65% at 50% 50%, rgba(56,224,195,0.07) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-2xl mx-auto text-center">
        <AnimatedSection>
          <motion.p variants={fadeUp} className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-6" style={{ color: "rgba(56,224,195,0.55)" }}>
            Ready?
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-5xl md:text-6xl font-display leading-[1.05] tracking-tight mb-6"
            style={{ color: "rgba(255,255,255,0.94)" }}
          >
            Study smarter,<br />
            <span style={{ color: MINT }}>starting tonight.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[15px] mb-10 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            1,000 free tokens on signup. No credit card. No subscription.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <WetPaintButton
              onClick={() => navigate("/auth?tab=signup")}
              className="inline-flex items-center gap-2 px-8 py-4 text-base"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </WetPaintButton>
            <Link
              to="/auth"
              className="text-sm transition-colors duration-150"
              style={{ color: "rgba(255,255,255,0.38)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.72)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.38)")}
            >
              Already have an account?
            </Link>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-10 px-6" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="StudyLM" className="w-6 h-6 rounded-lg object-cover" />
          <span className="font-display text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>StudyLM</span>
        </div>
        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
          © {new Date().getFullYear()} StudyLM · Built for university students worldwide 🇳🇬
        </p>
        <div className="flex items-center gap-6 text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>
          {[{ label: "Sign in", to: "/auth" }, { label: "Sign up", to: "/auth?tab=signup" }].map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="transition-colors duration-150"
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.72)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.32)")}
            >
              {label}
            </Link>
          ))}
          <a
            href="mailto:hello@studylm.app"
            className="transition-colors duration-150"
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.72)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.32)")}
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
