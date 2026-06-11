// Browser-based file text extraction for PDF, DOCX, TXT, MD

// Use the cdnjs CDN worker so Cloudflare Pages doesn't have to serve .mjs
// with the correct MIME type (it doesn't, causing "worker failed" errors).
const PDF_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

// Keep extracted text under ~700 KB so it fits in the Edge Function body (2 MB limit).
// At ~5 chars/word this is ~140 000 words ≈ a 400-page textbook.
const MAX_WORDS = 120_000;

export async function extractTextFromFile(file: File): Promise<{ text: string; truncated: boolean }> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  let raw: string;

  if (ext === "txt" || ext === "md") {
    raw = await file.text();
  } else if (ext === "pdf") {
    raw = await extractFromPDF(file);
  } else if (ext === "docx") {
    raw = await extractFromDOCX(file);
  } else {
    throw new Error(`Unsupported file type: .${ext ?? "unknown"}. Please upload a PDF, DOCX, TXT, or MD file.`);
  }

  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error(
      ext === "pdf"
        ? "No readable text found in this PDF. It may be a scanned image — try converting it to a text-based PDF first."
        : "This file appears to be empty."
    );
  }

  const words = trimmed.split(/\s+/);
  if (words.length > MAX_WORDS) {
    return {
      text: words.slice(0, MAX_WORDS).join(" "),
      truncated: true,
    };
  }

  return { text: trimmed, truncated: false };
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

/** Maps raw error messages to user-friendly strings. */
export function friendlyUploadError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("No readable text"))      return msg; // already friendly
  if (msg.includes("empty"))                 return msg;
  if (msg.includes("Unsupported file type")) return msg;
  if (msg.includes("413"))                   return "File is too large for storage. Try a smaller or compressed version.";
  if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("403"))
    return "Your session expired. Refresh the page and try again.";
  if (msg.includes("Failed to get upload URL") || msg.includes("upload URL"))
    return "Upload service is unavailable. Please try again in a moment.";
  if (msg.includes("R2 upload failed"))      return "File upload failed. Check your connection and try again.";
  if (msg.includes("NetworkError") || msg.includes("Failed to fetch"))
    return "Network error — check your connection and try again.";
  if (msg.includes("Processing failed") || msg.includes("process-source"))
    return "File uploaded but AI processing failed. You can retry from the sources panel.";

  return "Upload failed. Please try again or use a different file.";
}
