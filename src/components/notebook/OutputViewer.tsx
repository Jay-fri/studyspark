import { BookOpen } from "@/lib/icons";
import type { AIOutput, AIOutputContent } from "@/types";
import { SummaryView }    from "@/components/study/SummaryView";
import { QuizView }       from "@/components/study/QuizView";
import { FlashCardView }  from "@/components/study/FlashCardView";
import { MindMapView }    from "@/components/study/MindMapView";
import { StudyGuideView } from "@/components/study/StudyGuideView";
import { KeyConceptsView } from "@/components/study/KeyConceptsView";
import { PodcastScriptView } from "@/components/study/PodcastScriptView";

interface Props {
  output: AIOutput | null;
}

export function OutputViewer({ output }: Props) {
  if (!output) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <BookOpen className="w-10 h-10 text-[var(--text-muted)] mb-3" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">No output yet</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Select an action tab and click Generate
        </p>
      </div>
    );
  }

  const c = output.content as AIOutputContent;

  switch (c.type) {
    case "summary":
      return <SummaryView text={c.text} />;
    case "quiz":
      return <QuizView questions={c.questions} />;
    case "flashcards":
      return <FlashCardView cards={c.cards} />;
    case "mindmap":
      return <MindMapView root={c.root} />;
    case "studyguide":
      return <StudyGuideView sections={c.sections} />;
    case "keyconcepts":
      return <KeyConceptsView concepts={c.concepts} />;
    case "podcast":
      return <PodcastScriptView script={c.script} />;
    default:
      return (
        <div className="p-4">
          <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">
            {JSON.stringify(c, null, 2)}
          </pre>
        </div>
      );
  }
}
