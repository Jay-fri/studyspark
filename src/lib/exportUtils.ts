import type { QuizQuestion, Flashcard, StudyGuideSection } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function printHtml(html: string, title = "StudyLM Export") {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Segoe UI",system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.7}
  h1{font-size:22px;color:#E07B1A;margin-bottom:8px}
  h2{font-size:16px;font-weight:600;margin-top:24px;margin-bottom:6px}
  h3{font-size:14px;font-weight:600}
  p,li{font-size:14px}
  ul{padding-left:20px}li{margin-bottom:4px}
  table{border-collapse:collapse;width:100%;font-size:13px;margin:12px 0}
  th{background:#f5f5f5;text-align:left;padding:8px 12px;border:1px solid #ddd;font-weight:600}
  td{padding:8px 12px;border:1px solid #ddd}
  .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;background:#E07B1A22;color:#E07B1A}
  .q{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:12px 16px;margin-bottom:12px}
  .correct{color:#16a34a;font-weight:600}
  .card-front{font-weight:600}
  .card-back{color:#555}
  @media print{body{margin:0}a{text-decoration:none}}
</style></head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function downloadText(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export function exportQuizPDF(questions: QuizQuestion[], notebookTitle = "Quiz") {
  const html = `
    <h1>${notebookTitle}</h1>
    <p class="badge">${questions.length} Questions</p>
    ${questions.map((q, i) => `
      <div class="q">
        <h3>${i + 1}. ${q.question}</h3>
        <ul>
          ${q.options.map((opt, j) => `
            <li class="${j === q.correct_index ? "correct" : ""}">${String.fromCharCode(65 + j)}. ${opt}${j === q.correct_index ? " ✓" : ""}</li>
          `).join("")}
        </ul>
        <p style="margin-top:6px;font-size:12px;color:#555"><strong>Explanation:</strong> ${q.explanation}</p>
      </div>
    `).join("")}
  `;
  printHtml(html, `${notebookTitle} — Quiz`);
}

export function exportQuizText(questions: QuizQuestion[], notebookTitle = "Quiz"): void {
  const lines = [`${notebookTitle} — Quiz\n${"=".repeat(40)}\n`];
  questions.forEach((q, i) => {
    lines.push(`\n${i + 1}. ${q.question}`);
    q.options.forEach((opt, j) => {
      lines.push(`   ${String.fromCharCode(65 + j)}. ${opt}${j === q.correct_index ? " ✓" : ""}`);
    });
    lines.push(`   Explanation: ${q.explanation}`);
  });
  downloadText(lines.join("\n"), `${notebookTitle}-quiz.txt`);
}

// ─── Flashcards ───────────────────────────────────────────────────────────────

export function exportFlashcardsCSV(cards: Flashcard[], notebookTitle = "Flashcards"): void {
  const rows = ["Front,Back,Difficulty"];
  cards.forEach((c) => {
    const front = `"${c.front.replace(/"/g, '""')}"`;
    const back  = `"${c.back.replace(/"/g, '""')}"`;
    rows.push(`${front},${back},${c.difficulty}`);
  });
  downloadText(rows.join("\n"), `${notebookTitle}-flashcards.csv`, "text/csv");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function exportSummaryMarkdown(text: string, notebookTitle = "Summary"): void {
  const md = `# ${notebookTitle} — Summary\n\n${text}`;
  downloadText(md, `${notebookTitle}-summary.md`, "text/markdown");
}

export function exportSummaryPDF(text: string, notebookTitle = "Summary"): void {
  // Convert basic markdown to HTML for the print view
  const html = `<h1>${notebookTitle} — Summary</h1>` +
    text
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.split("|").filter(Boolean);
        return "<tr>" + cells.map((c) => `<td>${c.trim()}</td>`).join("") + "</tr>";
      });
  printHtml(`<div>${html}</div>`, `${notebookTitle} — Summary`);
}

// ─── Study Guide ──────────────────────────────────────────────────────────────

export function exportStudyGuidePDF(sections: StudyGuideSection[], notebookTitle = "Study Guide"): void {
  const html = `
    <h1>${notebookTitle} — Study Guide</h1>
    ${sections.map((s) => `
      <h2>${s.heading}</h2>
      <p>${s.body}</p>
      ${s.bullets && s.bullets.length > 0 ? `<ul>${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
    `).join("")}
  `;
  printHtml(html, `${notebookTitle} — Study Guide`);
}
