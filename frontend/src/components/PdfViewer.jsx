import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  X, 
  Loader2,
  AlertCircle
} from 'lucide-react'

// Setup worker
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export default function PdfViewer({ courseSlug, type = 'slides', courseName, onClose }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [error, setError] = useState(null)

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages)
    setPageNumber(1)
    setError(null)
  }

  function onDocumentLoadError(err) {
    console.error('PDF load error:', err)
    setError('Could not load PDF. Please check if the file exists.')
  }

  const changePage = (offset) => {
    setPageNumber(prev => Math.min(Math.max(prev + offset, 1), numPages))
  }

  const zoom = (delta) => {
    setScale(prev => Math.min(Math.max(prev + delta, 0.6), 2.0))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0c10]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-lg">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {type === 'slides' ? 'Slides' : 'Glossary'}
          </h2>
          <span className="hidden text-sm text-[var(--text-muted)] sm:inline">
            — {courseName}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="min-w-[80px] text-center text-sm font-medium text-[var(--text-primary)]">
              Page {pageNumber} of {numPages || '?'}
            </span>
            <button
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center border-l border-[var(--border)] pl-2 sm:gap-1 sm:pl-6">
            <button
              onClick={() => zoom(-0.15)}
              disabled={scale <= 0.6}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ZoomOut size={20} />
            </button>
            <span className="min-w-[50px] text-center text-xs font-bold text-[var(--text-muted)]">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => zoom(0.15)}
              disabled={scale >= 2.0}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ZoomIn size={20} />
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="ml-2 rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--accent-red)] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Viewer Area */}
      <div className="flex-1 overflow-auto bg-[#0b0c10] p-4 scrollbar-hide">
        <div className="flex min-h-full items-center justify-center">
          <Document
            file={`/api/content/pdf/${courseSlug}?type=${type}`}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
                <Loader2 className="animate-spin" size={40} />
                <p>Loading PDF...</p>
              </div>
            }
          >
            {error ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--accent-red)] bg-[rgba(255,77,77,0.1)] p-8 text-center">
                <AlertCircle size={40} className="text-[var(--accent-red)]" />
                <p className="text-[var(--text-primary)]">{error}</p>
                <button 
                  onClick={onClose}
                  className="rounded bg-[var(--accent-red)] px-4 py-2 text-sm font-bold text-white"
                >
                  Close Viewer
                </button>
              </div>
            ) : (
              <div className="shadow-2xl ring-1 ring-white/10">
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale} 
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                />
              </div>
            )}
          </Document>
        </div>
      </div>
    </div>
  )
}
