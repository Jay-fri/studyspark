import { motion } from "framer-motion";
import {
  Dna,
  Brain,
  Microscope,
  Stethoscope,
  HeartPulse,
  Zap,
  MessageSquare,
} from "@/lib/icons";

const FEATURES = [
  {
    icon: "🫀",
    title: "Interactive 3D Model",
    desc: "Rotate, zoom, and explore a full human body. Switch between skeletal, muscular, nervous, and circulatory systems.",
  },
  {
    icon: "🤖",
    title: "AI Explanations",
    desc: "Tap any organ, bone, or muscle for an instant AI breakdown — structure, function, and clinical relevance.",
  },
  {
    icon: "💬",
    title: "Ask the AI",
    desc: "Chat with the AI about any selected body part. From basic anatomy to pathology, symptoms, and treatment.",
  },
  {
    icon: "🧠",
    title: "System Explorer",
    desc: "Isolate any system — digestive, endocrine, lymphatic — with layer-by-layer visibility controls.",
  },
  {
    icon: "📋",
    title: "Anatomy Quizzes",
    desc: "Auto-generate targeted quizzes and flashcards from any selected body region.",
  },
  {
    icon: "🔬",
    title: "Microscopic View",
    desc: "Zoom to tissue and cell level with AI narration — perfect for histology and pathology students.",
  },
];

export default function AnatomyPage() {
  return (
    <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-10">
      <div className="max-w-5xl mx-auto">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-8">
          <p className="text-[11px] uppercase tracking-widest text-text-muted font-semibold mb-1">
            Coming soon
          </p>
          <h1 className="text-2xl md:text-[28px] font-semibold text-text-primary tracking-tight">
            3D Anatomy Explorer
          </h1>
        </motion.div>

        {/* ── Hero — image + pitch ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.04 }}
          className="rounded-xl overflow-hidden border mb-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            borderColor: "rgba(56,224,195,0.18)",
          }}>
          <div className="flex flex-col md:flex-row">
            {/* Image panel */}
            <div className="md:w-72 lg:w-96 shrink-0 flex items-end justify-center pt-4 md:pt-0">
              <img
                src="/anatomy.png"
                alt="3D anatomy model"
                className="w-64 md:w-72 lg:w-full h-auto object-contain select-none"
                draggable={false}
              />
            </div>

            {/* Text panel */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest w-fit mb-4"
                style={{
                  background: "rgba(56,224,195,0.1)",
                  color: "#38E0C3",
                  border: "0.5px solid rgba(56,224,195,0.28)",
                }}>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse inline-block" />
                In development
              </span>

              <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-3 leading-snug">
                Study anatomy the way
                <br />
                it was meant to be studied
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-5 max-w-md">
                An interactive 3D human body powered by AI. Tap any organ, bone,
                or muscle to get instant explanations, ask follow-up questions,
                and generate targeted study materials — all in one place.
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {[
                  { icon: Dna, label: "Full body model" },
                  { icon: Brain, label: "AI explanations" },
                  { icon: Microscope, label: "Cell-level zoom" },
                  { icon: Stethoscope, label: "Clinical context" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Icon className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Feature grid ─────────────────────────────────────────────── */}
        <p className="text-[11px] uppercase tracking-widest text-text-muted font-semibold mb-3">
          What to expect
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, delay: 0.06 + i * 0.04 }}
              className="rounded-xl border p-4"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.07)",
              }}>
              <span className="text-xl mb-2.5 block">{f.icon}</span>
              <p className="text-[12.5px] font-semibold text-text-primary mb-1">
                {f.title}
              </p>
              <p className="text-[12px] text-text-muted leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Bottom strip ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* CTA card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.3 }}
            className="flex-1 rounded-xl border p-4 flex items-center gap-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.07)",
            }}>
            <HeartPulse className="w-5 h-5 text-brand-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-text-primary mb-0.5">
                Built for medical & biology students
              </p>
              <p className="text-[11.5px] text-text-muted leading-relaxed">
                MBBS, nursing, dentistry, physio — 3D Anatomy Explorer is being
                designed for you.
              </p>
            </div>
            <button
              disabled
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-text-muted border cursor-not-allowed whitespace-nowrap"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}>
              <Zap className="w-3 h-3" />
              Notify me
            </button>
          </motion.div>

          {/* Interim suggestion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.35 }}
            className="sm:w-72 rounded-xl border p-4 flex items-start gap-3"
            style={{
              background: "rgba(56,224,195,0.04)",
              borderColor: "rgba(56,224,195,0.14)",
            }}>
            <MessageSquare className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-text-secondary leading-relaxed">
              <span className="text-brand-primary font-medium">
                In the meantime —
              </span>{" "}
              upload your anatomy textbooks or MBBS past questions to a Notebook
              and let the AI generate quizzes, flashcards, and summaries for
              you.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
