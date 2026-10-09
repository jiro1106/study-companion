/**
 * extractPdfText — shared PDF.js text extraction.
 *
 * Used by both library PDF import (api.ts) and chat file attachments, so the
 * worker setup and page-walking logic lives in exactly one place.
 */

export interface PdfExtractResult {
  text: string
  pageCount: number
}

export async function extractPdfText(
  bytes: Uint8Array,
  onProgress?: (currentPage: number, pageCount: number) => void
): Promise<PdfExtractResult> {
  const { getDocument: getPDFDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href

  const pdf = await getPDFDocument({ data: bytes }).promise
  const pageCount = pdf.numPages
  const pages: string[] = []

  for (let p = 1; p <= pageCount; p++) {
    onProgress?.(p, pageCount)
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ')
      .replace(/\s{2,}/g, ' ')
    pages.push(`[Page ${p}]\n${pageText}`)
  }

  return { text: pages.join('\n\n').trim(), pageCount }
}
