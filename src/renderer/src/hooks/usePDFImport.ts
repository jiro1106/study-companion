import { useState, useCallback } from 'react'
import type { StudyDocument, ImportResult } from '../../../shared/types'

export type ImportStatus = 'idle' | 'picking' | 'extracting' | 'done' | 'error'

export interface UsePDFImportResult {
  document: StudyDocument | null
  status: ImportStatus
  error: string | null
  importPDF: () => Promise<void>
  clearDocument: () => void
}

/**
 * Runs the full PDF import flow:
 * 1. Main process shows a file picker and returns raw bytes + metadata.
 * 2. The renderer uses PDF.js (browser context) to extract text.
 * 3. The cleaned StudyDocument is returned to callers.
 */
export function usePDFImport(): UsePDFImportResult {
  const [document, setDocument] = useState<StudyDocument | null>(null)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const importPDF = useCallback(async () => {
    setStatus('picking')
    setError(null)

    let result: ImportResult
    try {
      result = await window.bardhie.importPDF()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to open file picker')
      return
    }

    if (!result.ok) {
      if (result.reason === 'cancelled') {
        setStatus('idle')
        return
      }
      setStatus('error')
      setError(result.message ?? `Import failed: ${result.reason}`)
      return
    }

    // Extract text with PDF.js (browser context)
    setStatus('extracting')

    const rawDoc = result.document as StudyDocument & { _bytes?: string }
    const base64 = rawDoc._bytes

    if (!base64) {
      setStatus('error')
      setError('No file bytes received from main process.')
      return
    }

    try {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const text = await extractTextWithPDFjs(bytes)

      if (text.trim().length === 0) {
        setStatus('error')
        setError(
          `"${rawDoc.name}" appears to be a scanned PDF with no extractable text. Try a text-based PDF.`
        )
        return
      }

      const doc: StudyDocument = {
        id: rawDoc.id,
        name: rawDoc.name,
        text,
        pageCount: rawDoc.pageCount
      }

      setDocument(doc)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'PDF text extraction failed.')
    }
  }, [])

  const clearDocument = useCallback(() => {
    setDocument(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { document, status, error, importPDF, clearDocument }
}

/**
 * Use PDF.js to extract and clean text from the given PDF bytes.
 * Runs entirely in the renderer (browser) process.
 */
async function extractTextWithPDFjs(bytes: Uint8Array): Promise<string> {
  // Dynamic import keeps PDF.js out of the initial bundle
  const pdfjsLib = await import('pdfjs-dist')

  // Point the worker at the bundled worker file
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (pageText) pages.push(pageText)
  }

  // Update page count on the result (we only have it after extraction)
  const fullText = pages.join('\n\n')
  return fullText
}

/** Returns the page count from a PDF byte array without extracting text. */
export async function getPDFPageCount(bytes: Uint8Array): Promise<number> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
  return pdf.numPages
}
