// Browser-based file text extraction for PDF, DOCX, TXT, MD

// Use the cdnjs CDN worker so Cloudflare Pages doesn't have to serve .mjs
// with the correct MIME type (it doesn't, causing "worker failed" errors).
const PDF_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

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

  GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;

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
