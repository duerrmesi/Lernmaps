import { auth } from './firebase';
import { writeCloudPayload, readCloudPayload } from './cloudPayload';
import { getPdfFromStorage } from '../utils/documentStorage';
import { useStore } from '../store';

/**
 * Timeout helper to prevent any network promise from hanging forever.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    ),
  ]);
}

/**
 * Converts ArrayBuffer to Base64 safely without call stack limit.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunkSize) as unknown as number[]
    );
  }
  return btoa(binary);
}

/**
 * Converts Base64 to ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Uploads a PDF to Firestore chunked subcollection for reliable cross-device sync.
 * Completely free on Firebase Spark and uses already-deployed firestore.rules.
 */
export async function uploadPdfToCloud(
  docId: string,
  arrayBuffer: ArrayBuffer
): Promise<{ success: boolean }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Nicht bei Firebase angemeldet');
  }

  const base64Data = arrayBufferToBase64(arrayBuffer);

  // Maximum 25 seconds for large PDFs (e.g. 10MB)
  await withTimeout(
    writeCloudPayload(`users/${user.uid}/pdfs`, docId, {
      base64Data,
      docId,
      size: arrayBuffer.byteLength,
      updatedAt: new Date().toISOString(),
    }),
    25000,
    'Upload-Zeitüberschreitung'
  );

  return { success: true };
}

/**
 * Downloads a PDF from the Firestore cloud subcollection.
 * Has a strict 7-second timeout so it never hangs indefinitely.
 */
export async function downloadPdfFromCloud(
  docId: string
): Promise<ArrayBuffer | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const res = await withTimeout(
      readCloudPayload<{ base64Data: string }>(`users/${user.uid}/pdfs`, docId),
      7000,
      'Download-Zeitüberschreitung'
    );

    if (res?.data?.base64Data) {
      return base64ToArrayBuffer(res.data.base64Data);
    }
  } catch (err) {
    console.warn('PDF download from cloud failed or timed out:', err);
  }

  return null;
}

/**
 * Synchronizes any locally existing PDFs that have not yet been backed up to the cloud.
 */
export async function syncLocalPdfsToCloud(): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;

  const { documents } = useStore.getState();
  const docList = Object.values(documents || {});
  let syncedCount = 0;

  for (const doc of docList) {
    try {
      const localData = await getPdfFromStorage(doc.storageKey);
      if (!localData) continue;

      // Check if already in cloud with a quick read
      const existing = await withTimeout(
        readCloudPayload(`users/${user.uid}/pdfs`, doc.id),
        3000,
        'Check-Timeout'
      ).catch(() => null);

      if (!existing?.data) {
        await uploadPdfToCloud(doc.id, localData);
        syncedCount++;
      }
    } catch (err) {
      console.warn(`Sync for document ${doc.name} skipped:`, err);
    }
  }

  return syncedCount;
}
