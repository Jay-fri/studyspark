import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@/types";

interface UsernameModalProps {
  open: boolean;
  onDone: (username: string) => void;
}

export function UsernameModal({ open, onDone }: UsernameModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const validate = (v: string) => {
    if (v.length < 3) return "At least 3 characters";
    if (v.length > 20) return "Max 20 characters";
    if (!/^[a-z0-9_]+$/i.test(v)) return "Letters, numbers and _ only";
    return "";
  };

  const handleSave = async () => {
    const trimmed = value.trim().toLowerCase();
    const err = validate(trimmed);
    if (err) { setError(err); return; }

    setSaving(true);
    setError("");

    try {
      // Check uniqueness first
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", trimmed)
        .limit(1)
        .maybeSingle();

      if (existing) {
        setError("That username is already taken");
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username: trimmed })
        .eq("id", profile!.id);

      if (updateError) throw updateError;

      const { data: fresh } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile!.id)
        .single();

      if (fresh) refreshProfile(fresh as Profile);
      onDone(trimmed);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: "rgba(10,22,40,0.9)", backdropFilter: "blur(14px)" }}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl p-7"
            style={{
              background: "rgba(17,29,48,0.98)",
              border: "0.5px solid rgba(56,224,195,0.25)",
            }}
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
          >
            <div className="text-3xl mb-3 select-none">♟️</div>
            <h2
              className="text-xl font-medium mb-1"
              style={{ color: "rgba(255,255,255,0.9)", letterSpacing: "-0.025em" }}
            >
              Set your username
            </h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Others will use this to find and challenge you. It can't be changed later.
            </p>

            <div className="space-y-3">
              <div>
                <input
                  autoFocus
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="e.g. chesswiz99"
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `0.5px solid ${error ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: "rgba(255,255,255,0.9)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(56,224,195,0.4)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = error
                      ? "rgba(239,68,68,0.4)"
                      : "rgba(255,255,255,0.12)";
                  }}
                />
                {error && (
                  <p className="mt-1.5 text-xs" style={{ color: "rgba(239,68,68,0.8)" }}>
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !value.trim()}
                className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                style={{
                  background: "rgba(56,224,195,0.15)",
                  border: "0.5px solid rgba(56,224,195,0.35)",
                  color: "#38E0C3",
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.background = "rgba(56,224,195,0.22)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(56,224,195,0.15)";
                }}
              >
                {saving ? "Saving…" : "Set Username →"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
