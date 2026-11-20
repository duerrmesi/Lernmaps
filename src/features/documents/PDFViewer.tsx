import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  Link2,
  Columns,
  Maximize,
  Loader2,
  FileText,
  Check,
  RefreshCw,
  FileUp,
} from 'lucide-react';
import { useStore } from '../../store';
import { usePDFViewerStore } from '../../store/pdfViewerStore';
import { getPdfFromStorage, savePdfToStorage, pdfjsLib } from '../../utils/documentStorage';
import { downloadPdfFromCloud, uploadPdfToCloud } from '../../services/documentCloudSync';
import { auth } from '../../services/firebase';
import { cn } from '../../utils/cn';

interface PDFViewerProps {
  className?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ className }) => {
  const {
    isOpen,
    documentId,
    currentPage,
    viewMode,
    linkingNodeId,
    closeViewer,
    setCurrentPage,
    toggleViewMode,
  } = usePDFViewerStore();

  const { documents, mindmapNodes, linkPdfPageToNode } = useStore();
  const documentFile = documentId ? documents?.[documentId] : null;

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('PDF wird geladen...');
  const [isCloudDownloading, setIsCloudDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState<string>(String(currentPage));
  const [justLinked, setJustLinked] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const localFileInputRef = useRef<HTMLInputElement>(null);

  // Sync page input when currentPage changes
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Load PDF document from IndexedDB or Cloud
  const loadDocument = useCallback(async () => {
    if (!documentFile) {
      setPdfDoc(null);
      setNumPages(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingMessage('PDF wird aus lokalem Speicher geladen...');

    try {
      let arrayBuffer = await getPdfFromStorage(documentFile.storageKey);

      // If not available locally, attempt to download from Cloud
      if (!arrayBuffer) {
        setLoadingMessage('Lade Dokument aus der Cloud...');
        setIsCloudDownloading(true);
        try {
          arrayBuffer = await downloadPdfFromCloud(documentFile.id);
          if (arrayBuffer) {
            await savePdfToStorage(documentFile.storageKey, arrayBuffer);
          }
        } catch (cloudErr) {
          console.warn('Could not fetch PDF from cloud:', cloudErr);
        } finally {
          setIsCloudDownloading(false);
        }
      }

      if (!arrayBuffer) {
        setError(
          'Die Datei befindet sich noch nicht auf diesem Gerät und konnte nicht in der Cloud gefunden werden.'
        );
        setIsLoading(false);
        return;
      }

      setLoadingMessage('Verarbeite Dokument...');
      const copy = arrayBuffer.slice(0);
      const loadingTask = pdfjsLib.getDocument({
        data: copy,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
        cMapPacked: true,
      });

      const loadedDoc = await Promise.race([
        loadingTask.promise,
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('PDF.js Verarbeitungs-Timeout')), 10000)
        ),
      ]);

      setPdfDoc(loadedDoc);
      setNumPages(loadedDoc.numPages);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error rendering PDF with pdf.js:', err);
      setError('Fehler beim Öffnen des Dokuments: ' + (err?.message || 'Ungültiges PDF-Format'));
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, [documentFile]);

  useEffect(() => {
    if (!isOpen || !documentFile) {
      setPdfDoc(null);
      setNumPages(0);
      setIsLoading(false);
      return;
    }

    loadDocument();

    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [isOpen, documentFile, loadDocument]);

  // Render current page onto canvas with HiDPI support
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current || pageNum < 1 || pageNum > numPages) return;

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const viewport = page.getViewport({ scale });
        const pixelRatio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF render error:', err);
        }
      }
    },
    [pdfDoc, scale, numPages]
  );

  useEffect(() => {
    if (pdfDoc && currentPage >= 1 && currentPage <= numPages) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, numPages, renderPage]);

  if (!isOpen || !documentFile) return null;

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      setCurrentPage(page);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.6));
  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      if (containerWidth > 300) {
        setScale(containerWidth / 600); // Standard A4 width reference
      }
    }
  };

  const handleLinkToNode = () => {
    if (!linkingNodeId || !documentId) return;
    linkPdfPageToNode(linkingNodeId, documentId, currentPage);
    setJustLinked(true);
    setTimeout(() => setJustLinked(false), 2000);
  };

  const activeNode = linkingNodeId ? mindmapNodes[linkingNodeId] : null;
  const isSplit = viewMode === 'split';

  return (
    <div
      className={cn(
        'z-50 flex flex-col bg-bg-primary border-border shadow-2xl transition-all duration-200',
        isSplit
          ? 'fixed top-0 right-0 bottom-0 w-full sm:w-[480px] md:w-[560px] lg:w-[620px] xl:w-[700px] border-l'
          : 'fixed inset-4 md:inset-10 lg:inset-14 rounded-xl border',
        className
      )}
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-secondary select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-primary shrink-0" />
          <span
            className="text-xs font-semibold text-text-primary truncate max-w-[200px] md:max-w-[280px]"
            title={documentFile.name}
          >
            {documentFile.name}
          </span>
          {numPages > 0 && (
            <span className="text-[11px] text-text-disabled">({numPages} Seiten)</span>
          )}
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1">
          {linkingNodeId && activeNode && (
            <button
              onClick={handleLinkToNode}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer mr-1.5',
                justLinked
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25'
              )}
              title={`Seite ${currentPage} an Knoten "${activeNode.title}" anheften`}
            >
              {justLinked ? <Check size={13} /> : <Link2 size={13} />}
              <span>{justLinked ? 'Verlinkt!' : `Zu S. ${currentPage} verlinken`}</span>
            </button>
          )}

          <button
            onClick={toggleViewMode}
            className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title={isSplit ? 'Im Vollbild / Modal öffnen' : 'Als Seitenleiste (Split-View) andocken'}
          >
            {isSplit ? <Maximize size={15} /> : <Columns size={15} />}
          </button>

          <button
            onClick={closeViewer}
            className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Schließen"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Sub-Toolbar: Navigation, Zoom & Tools */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-canvas/80 text-xs shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoading}
            className="p-1 rounded hover:bg-bg-tertiary text-text-secondary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Vorherige Seite"
          >
            <ChevronLeft size={16} />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <span className="text-[11px] text-text-disabled">Seite</span>
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => setPageInput(String(currentPage))}
              className="w-10 text-center px-1 py-0.5 rounded border border-border bg-bg-tertiary text-text-primary text-xs focus:outline-hidden focus:border-primary"
            />
            <span className="text-[11px] text-text-disabled">von {numPages || 1}</span>
          </form>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages || isLoading}
            className="p-1 rounded hover:bg-bg-tertiary text-text-secondary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Nächste Seite"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.6 || isLoading}
            className="p-1 rounded hover:bg-bg-tertiary text-text-secondary disabled:opacity-30 cursor-pointer"
            title="Verkleinern"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] text-text-disabled w-10 text-center font-mono">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 3.0 || isLoading}
            className="p-1 rounded hover:bg-bg-tertiary text-text-secondary disabled:opacity-30 cursor-pointer"
            title="Vergrößern"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleFitWidth}
            className="px-1.5 py-0.5 ml-1 text-[10.5px] rounded border border-border hover:bg-bg-tertiary text-text-secondary transition-colors cursor-pointer"
            title="Breite anpassen"
          >
            Breite
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-bg-tertiary/60 p-4 flex justify-center items-start relative select-text"
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-primary/80 z-10 backdrop-blur-xs">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-xs text-text-secondary font-medium">{loadingMessage}</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mt-8 bg-bg-secondary border border-border rounded-xl shadow-md">
            <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 mb-3">
              <FileText size={32} />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Dokument noch nicht auf diesem Gerät
            </h3>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Die Datei <strong>{documentFile.name}</strong> wurde auf einem anderen Gerät (z. B. iPad) hinzugefügt, aber die Binärdaten sind noch nicht auf diesem Gerät gespeichert.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full justify-center">
              <button
                onClick={loadDocument}
                disabled={isCloudDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer w-full sm:w-auto justify-center"
              >
                <RefreshCw size={13} className={isCloudDownloading ? 'animate-spin' : ''} />
                <span>{isCloudDownloading ? 'Lade aus Cloud...' : 'Aus Cloud laden'}</span>
              </button>

              <button
                onClick={() => localFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-tertiary hover:bg-bg-hover text-text-primary text-xs font-medium transition-colors cursor-pointer w-full sm:w-auto justify-center"
              >
                <FileUp size={13} />
                <span>PDF lokal auswählen</span>
              </button>
            </div>

            <input
              ref={localFileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0];
                  const buf = await file.arrayBuffer();
                  await savePdfToStorage(documentFile.storageKey, buf);
                  if (auth.currentUser) {
                    uploadPdfToCloud(documentFile.id, buf).catch(console.warn);
                  }
                  loadDocument();
                }
              }}
            />

            <p className="text-[11px] text-text-disabled mt-3">
              Tipp: Klicke auf "PDF lokal auswählen" falls du die Datei auf dem PC hast, oder öffne LearnMap auf dem iPad zum automatischen Hochladen.
            </p>

            <button
              onClick={closeViewer}
              className="mt-3 text-[11px] text-text-disabled hover:text-text-secondary cursor-pointer"
            >
              Schließen
            </button>
          </div>
        )}

        {!error && (
          <div className="shadow-lg border border-border/80 bg-white rounded-xs overflow-hidden my-auto transition-transform">
            <canvas ref={canvasRef} className="block max-w-full" />
          </div>
        )}
      </div>

      {/* Footer Info if linked to node */}
      {linkingNodeId && activeNode && (
        <div className="px-3 py-1.5 border-t border-border bg-bg-secondary/60 text-[11px] text-text-secondary flex items-center justify-between shrink-0">
          <span className="truncate">
            Aktiver Knoten: <strong className="text-text-primary">{activeNode.title}</strong>
          </span>
          <span className="text-text-disabled shrink-0 ml-2">
            Klick oben auf „Zu S. {currentPage} verlinken“
          </span>
        </div>
      )}
    </div>
  );
};
