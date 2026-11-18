import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

const CHUNK_SIZE = 600000; // 600 KB per chunk (safe under 1 MB limit)

export interface PayloadMetadata {
  updatedAt: string;
  size: number;
  chunkCount: number;
  data?: string;
  [key: string]: any;
}

/**
 * Saves a JSON-serializable object to Firestore, automatically chunking across
 * a subcollection if the payload is larger than CHUNK_SIZE.
 */
export async function writeCloudPayload(
  collectionName: string,
  docId: string,
  payload: any,
  extraMeta: Record<string, any> = {}
): Promise<void> {
  const jsonString = JSON.stringify(payload);
  const size = jsonString.length;
  const targetDoc = doc(db, collectionName, docId);

  if (size <= CHUNK_SIZE) {
    // Fits in a single document
    await setDoc(targetDoc, {
      ...extraMeta,
      updatedAt: new Date().toISOString(),
      size,
      chunkCount: 1,
      data: jsonString,
    });
  } else {
    // Requires chunking
    const chunkCount = Math.ceil(size / CHUNK_SIZE);
    await setDoc(targetDoc, {
      ...extraMeta,
      updatedAt: new Date().toISOString(),
      size,
      chunkCount,
      data: null,
    });

    const chunksCol = collection(db, collectionName, docId, 'chunks');
    const promises: Promise<void>[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunkStr = jsonString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkDoc = doc(chunksCol, String(i));
      promises.push(setDoc(chunkDoc, { index: i, chunk: chunkStr }));
    }
    await Promise.all(promises);
  }
}

/**
 * Reads and reassembles a chunked or single-doc payload from Firestore.
 */
export async function readCloudPayload<T = any>(
  collectionName: string,
  docId: string
): Promise<{ data: T; meta: PayloadMetadata } | null> {
  const targetDoc = doc(db, collectionName, docId);
  const snapshot = await getDoc(targetDoc);

  if (!snapshot.exists()) {
    return null;
  }

  const meta = snapshot.data() as PayloadMetadata;

  if (meta.chunkCount === 1 && meta.data) {
    try {
      const parsed = JSON.parse(meta.data);
      return { data: parsed, meta };
    } catch (e) {
      console.error('Error parsing single payload:', e);
      return null;
    }
  }

  if (meta.chunkCount > 1) {
    const chunksCol = collection(db, collectionName, docId, 'chunks');
    const chunksSnap = await getDocs(chunksCol);
    const chunkMap = new Map<number, string>();

    chunksSnap.forEach((d) => {
      const cData = d.data();
      if (typeof cData.index === 'number' && typeof cData.chunk === 'string') {
        chunkMap.set(cData.index, cData.chunk);
      }
    });

    let fullJson = '';
    for (let i = 0; i < meta.chunkCount; i++) {
      const chunk = chunkMap.get(i);
      if (chunk === undefined) {
        throw new Error(`Missing chunk index ${i}`);
      }
      fullJson += chunk;
    }

    try {
      const parsed = JSON.parse(fullJson);
      return { data: parsed, meta };
    } catch (e) {
      console.error('Error parsing chunked payload:', e);
      return null;
    }
  }

  return null;
}
