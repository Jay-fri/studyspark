import { useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
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
  ChevronDown,
} from "@/lib/icons";
import { TOKEN_PACKAGES } from "@/types";

// ─── Animation variants ────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = (delay = 0.1) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

function AnimatedSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={stagger()}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}>
      {children}
    </motion.div>
  );
}

// ─── Feature cards ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: MessageSquare,
    title: "AI Chat",
    desc: "Ask questions about your notes and get instant, accurate answers — like a tutor who read your textbook.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: FileText,
    title: "Smart Summaries",
    desc: "Upload any PDF or document and get a structured, easy-to-revise summary in seconds.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: BookOpen,
    title: "Flashcards",
    desc: "AI-generated flashcards with spaced repetition ratings so you focus on what you don't know yet.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Brain,
    title: "Practice Quizzes",
    desc: "Multiple-choice quizzes with explanations — test yourself before the real exam.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Network,
    title: "Mind Maps",
    desc: "Visualise connections between concepts with automatically generated mind maps.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Library,
    title: "Study Library",
    desc: "All your notebooks, sources, and AI-generated outputs — searchable and organised in one place.",
    color: "from-sky-500 to-cyan-500",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Upload your materials",
    desc: "Add PDFs, Word docs, or paste text — StudyLM extracts and indexes every word.",
  },
  {
    n: "02",
    title: "Choose your study mode",
    desc: "Pick from Chat, Quiz, Flashcards, Summaries, or Mind Maps — or generate all at once.",
  },
  {
    n: "03",
    title: "Study and ace your exams",
    desc: "Review AI-generated study materials, track your progress, and go into every exam prepared.",
  },
] as const;

const TESTIMONIALS = [
  {
    name: "Adaeze O.",
    uni: "University of Lagos",
    text: "I went from spending 4 hours making notes to 20 minutes. StudyLM is genuinely insane for exam prep.",
    stars: 5,
  },
  {
    name: "Emeka T.",
    uni: "Covenant University",
    text: "The quiz feature caught gaps in my knowledge I didn't even know I had. Got 78% in Pharmacology.",
    stars: 5,
  },
  {
    name: "Fatimah A.",
    uni: "Ahmadu Bello University",
    text: "I upload my lecture slides and immediately get flashcards. My GPA jumped a full point this semester.",
    stars: 5,
  },
] as const;

// ─── Component ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user, isLoading } = useAuthStore();

  // Authenticated users don't need the landing page — restore their last location
  if (!isLoading && user) {
    return <Navigate to={getLastPath()} replace />;
  }

  return (
    <div className="min-h-dvh bg-surface-0 text-text-primary overflow-x-hidden">
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

// ── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 inset-x-0 z-50 glass border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="StudyLM"
            className="w-8 h-8 rounded-lg object-cover shadow-sm"
          />
          <span className="font-display text-lg">StudyLM</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
          {["Features", "How it works", "Pricing"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(" ", "-")}`}
              className="hover:text-text-primary transition-colors">
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link
            to="/auth?tab=signup"
            className="px-4 py-2 rounded-xl gradient-brand text-white text-sm font-medium shadow-md hover:opacity-90 transition-opacity">
            Get started free
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-40 pb-32 px-6 overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-brand-secondary/10 blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-8">
          <Zap className="w-3 h-3" />
          Powered by Llama 3.3 70B via Groq
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl font-display leading-[1.05] tracking-tight mb-6">
          Study <span className="gradient-text">Smarter</span>,
          <br />
          Not Harder
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your lecture notes and textbooks. StudyLM's AI turns them into
          summaries, flashcards, quizzes, and mind maps — so you spend less time
          making notes and more time actually learning.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/auth?tab=signup"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl gradient-brand text-white font-medium shadow-lg hover:opacity-90 transition-opacity text-base">
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-border bg-surface-1 text-text-primary font-medium hover:bg-surface-2 transition-colors text-base">
            See features
            <ChevronDown className="w-4 h-4" />
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-sm text-text-muted">
          Free — 1,000 tokens included on signup. No credit card required.
        </motion.p>
      </div>

      {/* UI preview mockup */}
      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-20 max-w-5xl mx-auto">
        <div className="bg-surface-1 border border-border rounded-3xl shadow-lg overflow-hidden">
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-2">
            <div className="flex gap-1.5">
              {["bg-red-400", "bg-yellow-400", "bg-green-400"].map((c) => (
                <div key={c} className={`w-3 h-3 rounded-full ${c}`} />
              ))}
            </div>
            <div className="flex-1 mx-4 bg-surface-0 border border-border rounded-lg px-3 py-1 text-xs text-text-muted text-center">
              studylm.app/notebook/pharmacology
            </div>
          </div>

          {/* Fake app content */}
          <div className="grid grid-cols-4 h-64 md:h-80">
            {/* Sidebar */}
            <div className="col-span-1 border-r border-border p-4 hidden md:block">
              <div className="space-y-2">
                {["📚 Pharmacology", "🧬 Biochemistry", "📐 Statistics"].map(
                  (item) => (
                    <div
                      key={item}
                      className={`text-xs px-3 py-2 rounded-lg ${item.startsWith("📚") ? "bg-brand-primary/10 text-brand-primary font-medium" : "text-text-muted"}`}>
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Main content */}
            <div className="col-span-4 md:col-span-3 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    AI Summary — Pharmacology Unit 3
                  </div>
                  <div className="text-xs text-text-muted">
                    Generated in 2.4s · 47 tokens used
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {[100, 80, 90, 70, 85].map((w, i) => (
                  <div
                    key={i}
                    className={`h-2.5 rounded-full bg-surface-2`}
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                {["Summary", "Quiz", "Flashcards", "Mind Map"].map((tab, i) => (
                  <div
                    key={tab}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${i === 0 ? "gradient-brand text-white" : "bg-surface-2 text-text-muted"}`}>
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

// ── Features ────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium text-brand-primary uppercase tracking-widest mb-3">
            Features
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-display">
            Everything you need to ace your exams
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-text-secondary max-w-xl mx-auto">
            From first upload to final review — StudyLM handles the busywork so
            you can focus on understanding.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group p-6 rounded-2xl bg-surface-1 border border-border hover:border-brand-primary/30 hover:shadow-md transition-all duration-200">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-sm`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-text-primary mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-surface-2/30">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium text-brand-primary uppercase tracking-widest mb-3">
            How it works
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-display">
            Three steps to exam-ready
          </motion.h2>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {STEPS.map((step) => (
            <motion.div key={step.n} variants={fadeUp} className="text-center">
              <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-5 shadow-md">
                <span className="text-white text-xl font-display">
                  {step.n}
                </span>
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium text-brand-primary uppercase tracking-widest mb-3">
            Pricing
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-display">
            Pay only for what you use
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-text-secondary">
            Start free. Top up tokens when you need them. No subscriptions.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Free tier */}
          <motion.div
            variants={fadeUp}
            className="p-8 rounded-3xl border border-border bg-surface-1">
            <p className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">
              Free
            </p>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-5xl font-display">1,000</span>
              <span className="text-text-secondary mb-2">tokens</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              On every new account — no credit card needed.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "AI Chat",
                "Summaries",
                "Quiz & Flashcards",
                "Mind Maps",
                "1 notebook",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/auth?tab=signup"
              className="block text-center py-3 rounded-xl border border-border text-text-primary text-sm font-medium hover:bg-surface-2 transition-colors">
              Get started free
            </Link>
          </motion.div>

          {/* Token packs */}
          <motion.div variants={fadeUp} className="space-y-3">
            {TOKEN_PACKAGES.map((pkg) => (
              <div
                key={pkg.label}
                className={`relative p-5 rounded-2xl border transition-all ${
                  pkg.popular
                    ? "border-brand-primary bg-brand-primary/5 shadow-md"
                    : "border-border bg-surface-1"
                }`}>
                {pkg.popular && (
                  <span className="absolute -top-2.5 left-5 px-2 py-0.5 rounded-full text-xs font-medium gradient-brand text-white shadow">
                    Most popular
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{pkg.label}</p>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {pkg.tokens.toLocaleString()} tokens
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-display text-text-primary">
                      ₦{pkg.price_ngn.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-muted">
                      ₦{((pkg.price_ngn / pkg.tokens) * 1000).toFixed(0)} / 1k
                      tokens
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-text-muted pt-2 text-center">
              Tokens never expire. Pay once, use whenever.
            </p>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="py-24 px-6 bg-surface-2/30">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <motion.p
            variants={fadeUp}
            className="text-sm font-medium text-brand-primary uppercase tracking-widest mb-3">
            Testimonials
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-display">
            Students love StudyLM
          </motion.h2>
        </AnimatedSection>

        <AnimatedSection className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="p-6 rounded-2xl bg-surface-1 border border-border">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-brand-warning text-brand-warning"
                  />
                ))}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                "{t.text}"
              </p>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {t.name}
                </p>
                <p className="text-xs text-text-muted">{t.uni}</p>
              </div>
            </motion.div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <AnimatedSection>
          <motion.div
            variants={fadeUp}
            className="relative p-12 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 gradient-brand opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
            <div className="relative z-10">
              <h2 className="text-4xl font-display text-white mb-4">
                Ready to study smarter?
              </h2>
              <p className="text-indigo-100 mb-8 text-lg">
                Join thousands of students worldwide who are already acing their
                exams with AI.
              </p>
              <Link
                to="/auth?tab=signup"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white text-brand-primary font-medium text-base shadow-lg hover:bg-indigo-50 transition-colors">
                Start for free — 1,000 tokens
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="StudyLM"
            className="w-7 h-7 rounded-lg object-cover"
          />
          <span className="font-display text-text-primary">StudyLM</span>
        </div>
        <p className="text-xs text-text-muted text-center">
          © {new Date().getFullYear()} StudyLM. Built for university students
          worldwide students. 🇳🇬
        </p>
        <div className="flex items-center gap-5 text-xs text-text-muted">
          <Link
            to="/auth"
            className="hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link
            to="/auth?tab=signup"
            className="hover:text-text-primary transition-colors">
            Sign up
          </Link>
          <a
            href="mailto:hello@studylm.app"
            className="hover:text-text-primary transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
