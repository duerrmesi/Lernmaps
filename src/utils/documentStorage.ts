import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export { pdfjsLib };

/**
 * Saves binary PDF data into IndexedDB under a given key.
 */
export async function savePdfToStorage(storageKey: string, data: ArrayBuffer | Blob): Promise<void> {
  let arrayBuffer: ArrayBuffer;
  if (data instanceof Blob) {
    arrayBuffer = await data.arrayBuffer();
  } else {
    arrayBuffer = data;
  }
  await idbSet(storageKey, arrayBuffer);
}

/**
 * Loads binary PDF data from IndexedDB as an ArrayBuffer.
 */
export async function getPdfFromStorage(storageKey: string): Promise<ArrayBuffer | null> {
  try {
    const data = await idbGet<ArrayBuffer>(storageKey);
    return data || null;
  } catch (err) {
    console.error('Error fetching PDF from IndexedDB:', err);
    return null;
  }
}

/**
 * Removes PDF binary data from IndexedDB.
 */
export async function deletePdfFromStorage(storageKey: string): Promise<void> {
  try {
    await idbDel(storageKey);
  } catch (err) {
    console.warn('Error deleting PDF from IndexedDB:', err);
  }
}

/**
 * Reads a PDF ArrayBuffer and extracts the total page count.
 */
export async function getPdfPageCount(arrayBuffer: ArrayBuffer): Promise<number> {
  try {
    // Clone buffer because PDF.js might transfer it
    const copy = arrayBuffer.slice(0);
    const loadingTask = pdfjsLib.getDocument({ data: copy });
    const pdfDoc = await loadingTask.promise;
    return pdfDoc.numPages;
  } catch (err) {
    console.warn('Could not determine PDF page count:', err);
    return 1;
  }
}
