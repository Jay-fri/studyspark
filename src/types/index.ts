// ─── Database Row types ────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "student" | "admin";
  university: string | null;
  study_tokens: number;
  total_tokens_used: number;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notebook {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  emoji: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  notebook_id: string;
  user_id: string;
  title: string;
  type: "pdf" | "docx" | "txt" | "md" | "url" | "text";
  content: string | null;
  file_url: string | null;
  word_count: number | null;
  created_at: string;
}

export type AIOutputType =
  | "summary"
  | "quiz"
  | "flashcards"
  | "mindmap"
  | "studyguide"
  | "keyconcepts"
  | "podcast"
  | "chat_history";

export interface AIOutput {
  id: string;
  notebook_id: string;
  user_id: string;
  type: AIOutputType;
  content: AIOutputContent;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  notebook_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  type: "grant" | "spend" | "purchase" | "admin_grant";
  amount: number;
  description: string | null;
  flutterwave_ref: string | null;
  balance_after: number | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  flutterwave_ref: string;
  amount_ngn: number;
  tokens_purchased: number;
  status: "pending" | "success" | "failed";
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── AI Content types ──────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
  color?: string;
}

export interface KeyConcept {
  term: string;
  definition: string;
  importance?: "high" | "medium" | "low";
  example?: string;
}

export interface StudyGuideSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export type AIOutputContent =
  | { type: "summary";      text: string }
  | { type: "quiz";         questions: QuizQuestion[] }
  | { type: "flashcards";   cards: Flashcard[] }
  | { type: "mindmap";      root: MindMapNode }
  | { type: "studyguide";   sections: StudyGuideSection[] }
  | { type: "keyconcepts";  concepts: KeyConcept[] }
  | { type: "podcast";      script: string }
  | { type: "chat_history"; messages: Pick<ChatMessage, "role" | "content">[] };

// ─── Supabase Database type (for typed client) ─────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles:           { Row: Profile;          Insert: Partial<Profile>;          Update: Partial<Profile>           };
      notebooks:          { Row: Notebook;         Insert: Partial<Notebook>;         Update: Partial<Notebook>          };
      sources:            { Row: Source;           Insert: Partial<Source>;           Update: Partial<Source>            };
      ai_outputs:         { Row: AIOutput;         Insert: Partial<AIOutput>;         Update: Partial<AIOutput>          };
      chat_messages:      { Row: ChatMessage;      Insert: Partial<ChatMessage>;      Update: Partial<ChatMessage>       };
      token_transactions: { Row: TokenTransaction; Insert: Partial<TokenTransaction>; Update: Partial<TokenTransaction>  };
      payments:           { Row: Payment;          Insert: Partial<Payment>;          Update: Partial<Payment>           };
    };
    Functions: {
      deduct_tokens: {
        Args: { p_user_id: string; p_amount: number; p_description: string };
        Returns: number;
      };
    };
  };
}

export interface Announcement {
  id: string;
  created_by: string | null;
  title: string;
  message: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── UI / app-layer types ──────────────────────────────────────────────────

export interface NotebookWithStats extends Notebook {
  source_count: number;
  last_studied: string | null;
}

export interface TokenPackage {
  tokens: number;
  price_ngn: number;
  label: string;
  popular?: boolean;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  { tokens: 1_000,  price_ngn: 2_000,  label: "Starter",  },
  { tokens: 5_000,  price_ngn: 8_000,  label: "Study Pro", popular: true },
  { tokens: 15_000, price_ngn: 20_000, label: "Scholar"   },
];

export const NIGERIAN_UNIVERSITIES = [
  "University of Lagos (UNILAG)",
  "Obafemi Awolowo University (OAU)",
  "University of Ibadan (UI)",
  "Ahmadu Bello University (ABU)",
  "University of Nigeria, Nsukka (UNN)",
  "Federal University of Technology, Akure (FUTA)",
  "Lagos State University (LASU)",
  "Covenant University",
  "Babcock University",
  "Redeemer's University",
  "Pan-Atlantic University",
  "American University of Nigeria",
  "Nile University of Nigeria",
  "Baze University",
  "University of Benin (UNIBEN)",
  "Delta State University",
  "Rivers State University",
  "University of Port Harcourt (UNIPORT)",
  "Enugu State University of Science and Technology (ESUT)",
  "Other",
] as const;
