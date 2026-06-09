import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home } from "@/lib/icons";

export default function NotFoundPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-0 text-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <p className="text-8xl font-display gradient-text mb-4">404</p>
        <h1 className="text-2xl font-display text-text-primary mb-2">Page not found</h1>
        <p className="text-text-secondary mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white font-medium shadow-md hover:opacity-90 transition-opacity"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
