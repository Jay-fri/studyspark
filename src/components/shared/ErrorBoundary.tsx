import React from "react";
import { RefreshCw } from "@/lib/icons";

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 p-6 text-center">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Something went wrong loading this section.
        </p>
        <p className="text-xs text-[var(--text-muted)] max-w-sm">
          {this.state.error.message}
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors text-[var(--text-secondary)]"
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </button>
      </div>
    );
  }
}
