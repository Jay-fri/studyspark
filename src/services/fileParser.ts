// Browser-based file text extraction for PDF, DOCX, TXT, MD

// Vite bundles the worker as a static asset; the URL always matches the installed
// pdfjs-dist version, eliminating "API version does not match Worker version" errors.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt" || ext === "md") {
    return file.text();
  }

  if (ext === "pdf") {
    return extractFromPDF(file);
  }

  if (ext === "docx") {
    return extractFromDOCX(file);
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

async function extractFromPDF(file: File): Promise<string> {
  const { GlobalWorkerOptions, getDocument } = await import("pdfjs-dist");

  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buffer = await file.arrayBuffer();
  const pdf    = await getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text    = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

async function extractFromDOCX(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer  = await file.arrayBuffer();
  const result  = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
