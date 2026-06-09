import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Loader2 } from "@/lib/icons";
import { queryClient } from "@/lib/queryClient";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useTheme } from "@/hooks/useTheme";

// Lazy-loaded pages
const LandingPage    = lazy(() => import("@/pages/LandingPage"));
const AuthPage       = lazy(() => import("@/pages/AuthPage"));
const DashboardPage  = lazy(() => import("@/pages/DashboardPage"));
const NotebooksPage  = lazy(() => import("@/pages/NotebooksPage"));
const NotebookPage   = lazy(() => import("@/pages/NotebookPage"));
const LibraryPage    = lazy(() => import("@/pages/LibraryPage"));
const UploadPage     = lazy(() => import("@/pages/UploadPage"));
const ChatPage       = lazy(() => import("@/pages/ChatPage"));
const FlashcardsPage = lazy(() => import("@/pages/FlashcardsPage"));
const QuizPage       = lazy(() => import("@/pages/QuizPage"));
const ProgressPage   = lazy(() => import("@/pages/ProgressPage"));
const SettingsPage      = lazy(() => import("@/pages/SettingsPage"));
const StudyReviewPage   = lazy(() => import("@/pages/StudyReviewPage"));
const StudyModePage     = lazy(() => import("@/pages/StudyModePage"));
const AdminPage         = lazy(() => import("@/pages/AdminPage"));
const AnatomyPage       = lazy(() => import("@/pages/AnatomyPage"));
const FeedbackPage      = lazy(() => import("@/pages/FeedbackPage"));
const NotFoundPage           = lazy(() => import("@/pages/NotFoundPage"));
const PaymentCallbackPage    = lazy(() => import("@/pages/PaymentCallbackPage"));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-dvh">
      <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
    </div>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useTheme();
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthBootstrap />
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/"                  element={<LandingPage />} />
              <Route path="/auth"              element={<AuthPage />} />
              <Route path="/payment-callback"  element={<PaymentCallbackPage />} />

              {/* Protected — regular users */}
              <Route element={<AuthGuard />}>
                <Route element={<AppShell />}>
                  <Route path="/dashboard"        element={<DashboardPage />} />
                  <Route path="/notebooks"         element={<NotebooksPage />} />
                  <Route path="/notebooks/:id"     element={<NotebookPage />} />
                  <Route path="/library"           element={<LibraryPage />} />
                  <Route path="/upload"            element={<UploadPage />} />
                  <Route path="/chat"              element={<ChatPage />} />
                  <Route path="/flashcards"        element={<FlashcardsPage />} />
                  <Route path="/quiz"              element={<QuizPage />} />
                  <Route path="/progress"          element={<ProgressPage />} />
                  <Route path="/settings"          element={<SettingsPage />} />
                  <Route path="/anatomy"           element={<AnatomyPage />} />
                  <Route path="/feedback"          element={<FeedbackPage />} />
                  <Route path="/study/review"      element={<StudyReviewPage />} />
                  <Route path="/study/:notebookId" element={<StudyModePage />} />
                </Route>
              </Route>

              {/* Admin only */}
              <Route element={<AuthGuard adminOnly />}>
                <Route element={<AppShell />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </ThemeProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
