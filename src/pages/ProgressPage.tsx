import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Award,
} from "@/lib/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDuration } from "@/lib/utils";
import { format, subDays } from "date-fns";

const weekData = Array.from({ length: 7 }, (_, i) => ({
  day: format(subDays(new Date(), 6 - i), "EEE"),
  minutes: Math.floor(Math.random() * 90),
  sessions: Math.floor(Math.random() * 4),
}));

const quizScores = Array.from({ length: 5 }, (_, i) => ({
  quiz: `Quiz ${i + 1}`,
  score: 55 + Math.floor(Math.random() * 45),
}));

const stats = [
  { label: "Total Study Time", value: formatDuration(3240), icon: Clock,      color: "text-brand-primary",   bg: "bg-brand-primary/10"   },
  { label: "Current Streak",   value: "3 days",             icon: Flame,      color: "text-brand-warning",   bg: "bg-brand-warning/10"   },
  { label: "Quizzes Taken",    value: "5",                  icon: Target,     color: "text-brand-secondary", bg: "bg-brand-secondary/10" },
  { label: "Avg. Quiz Score",  value: "72%",                icon: TrendingUp, color: "text-brand-accent",    bg: "bg-brand-accent/10"    },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
};

export default function ProgressPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Your Progress"
        subtitle="Track your study habits and performance over time"
      />

      {/* Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={item}
            className="bg-surface-1 border border-border rounded-2xl p-4 shadow-sm"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-display text-text-primary">{s.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Study time chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-1 border border-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-medium text-text-primary">Study Time (last 7 days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}m`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: 12,
                }}
                formatter={(v) => [`${v} min`, "Study time"]}
              />
              <Bar dataKey="minutes" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quiz scores chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-1 border border-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-brand-accent" />
            <h3 className="text-sm font-medium text-text-primary">Quiz Scores</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={quizScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="quiz"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: 12,
                }}
                formatter={(v) => [`${v}%`, "Score"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--brand-accent)"
                strokeWidth={2}
                dot={{ fill: "var(--brand-accent)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 bg-surface-1 border border-border rounded-2xl p-5 shadow-sm"
      >
        <h3 className="text-sm font-medium text-text-primary mb-4">Achievements</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { emoji: "🎓", label: "First Upload", earned: true },
            { emoji: "💬", label: "First Chat",   earned: true },
            { emoji: "🔥", label: "3-Day Streak", earned: true },
            { emoji: "📚", label: "10 Flashcards",earned: false },
            { emoji: "🏆", label: "Perfect Quiz",  earned: false },
            { emoji: "⚡", label: "Speed Learner", earned: false },
          ].map((a) => (
            <div
              key={a.label}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-opacity ${a.earned ? "opacity-100" : "opacity-30"}`}
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-xs text-text-muted">{a.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
