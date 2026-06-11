// ─── Database Row types ────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "student" | "admin";
  university: string | null;
  username: string | null;
  study_tokens: number;
  total_tokens_used: number;
  is_suspended: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  chess_elo: number;
  draughts_wins: number;
  scrabble_high_score: number;
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
  cover_image_url: string | null;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  notebook_id: string;
  user_id: string;
  title: string;
  type: "pdf" | "docx" | "txt" | "md" | "url" | "text";
  /** Null for file-type sources processed through the R2 pipeline (text lives in source_chunks). */
  content: string | null;
  file_url: string | null;
  file_path: string | null;
  processing_status: "pending" | "processing" | "ready" | "error";
  error_message: string | null;
  word_count: number | null;
  chunk_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface SourceChunk {
  id: string;
  source_id: string;
  notebook_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
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

export interface GenerationOptions {
  difficulty: "easy" | "medium" | "hard" | "mixed";
  count: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
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
      source_chunks:      { Row: SourceChunk;     Insert: Partial<SourceChunk>;     Update: Partial<SourceChunk>       };
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
  // Federal Universities
  "Ahmadu Bello University, Zaria (ABU)",
  "Bayero University, Kano (BUK)",
  "Federal University of Agriculture, Abeokuta (FUNAAB)",
  "Federal University of Agriculture, Makurdi (FUAM)",
  "Federal University of Agriculture, Zuru",
  "Federal University of Technology, Akure (FUTA)",
  "Federal University of Technology, Minna (FUTMINNA)",
  "Federal University of Technology, Owerri (FUTO)",
  "Federal University, Birnin Kebbi",
  "Federal University, Dutse",
  "Federal University, Dutsin-Ma",
  "Federal University, Gashua",
  "Federal University, Gusau",
  "Federal University, Kashere",
  "Federal University, Lafia",
  "Federal University, Lokoja",
  "Federal University, Ndufu-Alike (FUNAI)",
  "Federal University, Otuoke",
  "Federal University, Oye-Ekiti (FUOYE)",
  "Federal University, Wukari",
  "Michael Okpara University of Agriculture, Umudike (MOUAU)",
  "Modibbo Adama University, Yola",
  "National Open University of Nigeria (NOUN)",
  "Nigerian Defence Academy, Kaduna (NDA)",
  "Nnamdi Azikiwe University, Awka (UNIZIK)",
  "Obafemi Awolowo University, Ile-Ife (OAU)",
  "University of Abuja",
  "University of Agriculture, Makurdi",
  "University of Benin (UNIBEN)",
  "University of Calabar (UNICAL)",
  "University of Ibadan (UI)",
  "University of Ilorin (UNILORIN)",
  "University of Jos (UNIJOS)",
  "University of Lagos (UNILAG)",
  "University of Maiduguri (UNIMAID)",
  "University of Nigeria, Nsukka (UNN)",
  "University of Port Harcourt (UNIPORT)",
  "Usmanu Danfodiyo University, Sokoto (UDUS)",
  // State Universities
  "Abia State University (ABSU)",
  "Adamawa State University (ADSU)",
  "Adekunle Ajasin University, Akungba (AAUA)",
  "Akwa Ibom State University (AKSU)",
  "Ambrose Alli University, Ekpoma (AAU)",
  "Anambra State University (ANSU)",
  "Bauchi State University, Gadau (BASU)",
  "Benue State University, Makurdi (BSU)",
  "Cross River University of Technology (CRUTECH)",
  "Delta State University, Abraka (DELSU)",
  "Ebonyi State University (EBSU)",
  "Ekiti State University (EKSU)",
  "Enugu State University of Science and Technology (ESUT)",
  "Gombe State University (GSU)",
  "Ibrahim Badamasi Babangida University, Lapai (IBBU)",
  "Ignatius Ajuru University of Education, Port Harcourt",
  "Imo State University (IMSU)",
  "Kaduna State University (KASU)",
  "Kebbi State University of Science and Technology (KSUST)",
  "Kogi State University, Anyigba",
  "Kwara State University, Malete (KWASU)",
  "Ladoke Akintola University of Technology, Ogbomoso (LAUTECH)",
  "Lagos State University (LASU)",
  "Nasarawa State University, Keffi (NSUK)",
  "Niger Delta University, Wilberforce Island",
  "Olabisi Onabanjo University (OOU)",
  "Ondo State University of Science and Technology (OSUSTECH)",
  "Osun State University (UNIOSUN)",
  "Plateau State University, Bokkos",
  "Rivers State University, Port Harcourt (RSU)",
  "Sokoto State University (SSU)",
  "Tai Solarin University of Education, Ijebu-Ode (TASUED)",
  "Taraba State University, Jalingo (TSU)",
  "Umaru Musa Yar'Adua University, Katsina (UMYU)",
  "University of Africa, Toru-Orua, Bayelsa",
  "Yobe State University, Damaturu (YSU)",
  "Zamfara State University",
  // Private Universities
  "Achievers University, Owo",
  "Afe Babalola University, Ado-Ekiti (ABUAD)",
  "African University of Science and Technology, Abuja (AUST)",
  "Ajayi Crowther University, Oyo",
  "Al-Hikmah University, Ilorin",
  "Al-Qalam University, Katsina",
  "American University of Nigeria, Yola (AUN)",
  "Anchor University, Lagos",
  "Augustine University, Ilara-Epe",
  "Babcock University, Ilishan-Remo",
  "Baze University, Abuja",
  "Benson Idahosa University, Benin City",
  "Bowen University, Iwo",
  "Caleb University, Lagos",
  "Caritas University, Enugu",
  "Chrisland University",
  "Christopher University, Mowe",
  "Coal City University, Enugu",
  "Covenant University, Ota",
  "Crawford University, Igbesa",
  "Crescent University, Abeokuta",
  "Dominican University, Ibadan",
  "Edwin Clark University, Kiagbodo",
  "Elizade University, Ilara-Mokin",
  "Evangel University, Akaeze",
  "Fountain University, Osogbo",
  "Godfrey Okoye University, Enugu",
  "Gregory University, Uturu",
  "Hallmark University, Ijebu-Itele",
  "Hezekiah University, Umudi",
  "Igbinedion University, Okada",
  "Joseph Ayo Babalola University, Ikeji-Arakeji",
  "Kings University, Ode-Omu",
  "Landmark University, Omu-Aran",
  "Lead City University, Ibadan",
  "Legacy University, Okija",
  "Madonna University, Okija",
  "McPherson University, Seriki Sotayo",
  "Mountain Top University, Ibafo",
  "Nile University of Nigeria, Abuja",
  "Novena University, Ogume",
  "Oduduwa University, Ipetumodu",
  "Pan-Atlantic University, Lagos",
  "Paul University, Awka",
  "Precious Cornerstone University, Ibadan",
  "Redeemer's University, Ede",
  "Renaissance University, Enugu",
  "Rhema University, Obeama-Asa",
  "Ritman University, Ikot Ekpene",
  "Salem University, Lokoja",
  "Samuel Adegboyega University, Ogwa",
  "Spiritan University, Nneochi",
  "Summit University, Offa",
  "Tansian University, Umunya",
  "Trinity University, Ogun State",
  "Veritas University, Abuja",
  "Wellspring University, Evbuobanosa",
  "Wesley University, Ondo",
  "Western Delta University, Oghara",
  "Wigwe University, Isiokpo",
  "Other",
] as const;
