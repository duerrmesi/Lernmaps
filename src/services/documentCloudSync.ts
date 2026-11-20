import { auth, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, getBytes } from 'firebase/storage';
import { writeCloudPayload, readCloudPayload } from './cloudPayload';
import { getPdfFromStorage } from '../utils/documentStorage';
import { useStore } from '../store';

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
 * Uploads a PDF to the cloud for cross-device sync.
 * Tries Firebase Storage first (up to 5GB free), falls back to chunked Firestore.
 */
export async function uploadPdfToCloud(
  docId: string,
  arrayBuffer: ArrayBuffer
): Promise<{ downloadUrl?: string; method: 'storage' | 'firestore' }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Nicht bei Firebase angemeldet');
  }

  // 1. Attempt Firebase Storage
  try {
    const storageRef = ref(storage, `users/${user.uid}/pdfs/${docId}.pdf`);
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    await uploadBytes(storageRef, blob, {
      contentType: 'application/pdf',
      customMetadata: { docId, userId: user.uid },
    });
    const downloadUrl = await getDownloadURL(storageRef);
    return { downloadUrl, method: 'storage' };
  } catch (storageErr) {
    console.warn('Firebase Storage upload failed, falling back to Firestore subcollection:', storageErr);
  }

  // 2. Fallback: Firestore chunked subcollection
  const base64Data = arrayBufferToBase64(arrayBuffer);
  await writeCloudPayload(`users/${user.uid}/pdfs`, docId, {
    base64Data,
    docId,
    updatedAt: new Date().toISOString(),
  });

  return { method: 'firestore' };
}

/**
 * Downloads a PDF from the cloud if missing from local IndexedDB.
 */
export async function downloadPdfFromCloud(
  docId: string,
  downloadUrl?: string
): Promise<ArrayBuffer | null> {
  const user = auth.currentUser;

  // 1. If we have a direct downloadUrl, try fetching it
  if (downloadUrl) {
    try {
      const res = await fetch(downloadUrl);
      if (res.ok) {
        return await res.arrayBuffer();
      }
    } catch (urlErr) {
      console.warn('Direct download URL failed:', urlErr);
    }
  }

  if (!user) return null;

  // 2. Try fetching from Firebase Storage
  try {
    const storageRef = ref(storage, `users/${user.uid}/pdfs/${docId}.pdf`);
    const buffer = await getBytes(storageRef);
    if (buffer) return buffer;
  } catch (storageErr) {
    // Ignore and proceed to Firestore fallback
  }

  // 3. Try fetching from Firestore subcollection
  try {
    const res = await readCloudPayload<{ base64Data: string }>(
      `users/${user.uid}/pdfs`,
      docId
    );
    if (res?.data?.base64Data) {
      return base64ToArrayBuffer(res.data.base64Data);
    }
  } catch (firestoreErr) {
    console.warn('Firestore PDF download failed:', firestoreErr);
  }

  return null;
}

/**
 * Synchronizes any locally existing PDFs that have not yet been backed up to the cloud.
 */
export async function syncLocalPdfsToCloud(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const { documents, updateDocument } = useStore.getState();
  const docList = Object.values(documents || {});

  for (const doc of docList) {
    try {
      // Check if we have the file locally
      const localData = await getPdfFromStorage(doc.storageKey);
      if (!localData) continue;

      // Check if it already has a downloadUrl or if we should sync
      if (!doc.downloadUrl) {
        const res = await uploadPdfToCloud(doc.id, localData);
        if (res.downloadUrl) {
          updateDocument(doc.id, { downloadUrl: res.downloadUrl });
        }
      }
    } catch (err) {
      console.warn(`Failed to sync document ${doc.name} to cloud:`, err);
    }
  }
}
