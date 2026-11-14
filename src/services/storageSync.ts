import type { StateStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export interface StorageStatus {
  status: 'synced' | 'saving' | 'error' | 'idle';
  lastSaved: Date | null;
  filePath: string;
  fileSize: number;
  error?: string;
  isWebMode?: boolean;
  isPersisted?: boolean;
}

let currentStatus: StorageStatus = {
  status: 'idle',
  lastSaved: null,
  filePath: 'data/learnmap_data.json',
  fileSize: 0,
  isWebMode: false,
  isPersisted: false,
};

let lastSavedString: string | null = null;
let isSyncPaused = false;
let backendAvailable: boolean | null = null;

export function setSyncPaused(paused: boolean): void {
  isSyncPaused = paused;
}

const listeners = new Set<(status: StorageStatus) => void>();

function notify(updates: Partial<StorageStatus>) {
  currentStatus = { ...currentStatus, ...updates };
  listeners.forEach((listener) => {
    try {
      listener(currentStatus);
    } catch {
      // ignore listener error
    }
  });
}

export function getStorageStatus(): StorageStatus {
  return currentStatus;
}

export function subscribeStorageStatus(listener: (status: StorageStatus) => void): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => {
    listeners.delete(listener);
  };
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingDataToSave: any = null;
let backendAvailabilityPromise: Promise<boolean> | null = null;

/**
 * Request persistent storage from the browser so that data is guaranteed
 * to remain on the user's PC across browser reloads, cache cleans, and restarts.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isAlreadyPersisted = await navigator.storage.persisted();
      if (!isAlreadyPersisted) {
        const granted = await navigator.storage.persist();
        notify({ isPersisted: granted });
        return granted;
      }
      notify({ isPersisted: true });
      return true;
    } catch (err) {
      console.warn('Could not request persistent storage:', err);
    }
  }
  return false;
}

/**
 * Check if the Vite local backend storage endpoint is available
 */
export async function checkBackendAvailability(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  if (backendAvailabilityPromise) return backendAvailabilityPromise;

  backendAvailabilityPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch('/api/storage/info', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data && data.success) {
            backendAvailable = true;
            return true;
          }
        }
      }
    } catch {
      // network or abort error -> running in static/web mode
    }
    backendAvailable = false;
    notify({
      isWebMode: true,
      filePath: 'Browser PC-Speicher (IndexedDB & LocalStorage)',
      status: 'synced',
      error: undefined,
    });
    return false;
  })();

  return backendAvailabilityPromise;
}

/**
 * Save data reliably in browser storage (IndexedDB + LocalStorage backup).
 * IndexedDB has virtually unlimited capacity on the local hard drive,
 * ensuring large notes, images, mindmaps, and timelines are never lost on reload.
 */
export async function saveToBrowserStorage(payload: any): Promise<boolean> {
  if (isSyncPaused) return true;

  try {
    // Crucial: ALWAYS JSON serialize first to strip any non-cloneable objects like functions/symbols
    const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let cleanObject: any;
    try {
      cleanObject = JSON.parse(bodyStr);
    } catch {
      cleanObject = bodyStr;
    }

    let idbSuccess = false;
    let lsSuccess = false;

    // 1. Save directly into IndexedDB (virtually unlimited capacity, persistent on local PC)
    try {
      await idbSet('learnmap-storage-state', cleanObject);
      await idbSet('learnmap-storage-raw', bodyStr);
      await idbSet('learnmap-storage-timestamp', Date.now());
      idbSuccess = true;
    } catch (idbErr) {
      console.warn('IndexedDB write warning:', idbErr);
    }

    // 2. Also keep localStorage updated for fast immediate cache (if within 5MB quota)
    try {
      localStorage.setItem('learnmap-storage', bodyStr);
      lsSuccess = true;
    } catch (lsErr) {
      console.warn('localStorage quota reached, IndexedDB safely persisted the full data:', lsErr);
    }

    if (!idbSuccess && !lsSuccess) {
      throw new Error('Speichern im Browser fehlgeschlagen (IndexedDB & LocalStorage blockiert).');
    }

    lastSavedString = bodyStr;
    notify({
      status: 'synced',
      lastSaved: new Date(),
      filePath: 'Browser PC-Speicher (Dauerhaft in IndexedDB & LocalStorage)',
      fileSize: bodyStr.length,
      isWebMode: true,
      error: undefined,
    });
    return true;
  } catch (err: any) {
    console.error('saveToBrowserStorage failed:', err);
    notify({
      status: 'error',
      error: err?.message || 'Fehler beim Speichern im Browser-Speicher',
    });
    return false;
  }
}

/**
 * Load complete state from browser storage (IndexedDB primary, LocalStorage fallback)
 */
export async function loadFromBrowserStorage(): Promise<any | null> {
  try {
    const idbState = await idbGet<any>('learnmap-storage-state');
    if (idbState && (idbState.state || idbState.projects)) {
      return idbState;
    }
    const rawStr = await idbGet<string>('learnmap-storage-raw');
    if (rawStr) {
      return JSON.parse(rawStr);
    }
  } catch (err) {
    console.warn('loadFromBrowserStorage IndexedDB error:', err);
  }

  // Fallback to localStorage
  try {
    const ls = localStorage.getItem('learnmap-storage');
    if (ls) {
      return JSON.parse(ls);
    }
  } catch (err) {
    console.warn('loadFromBrowserStorage localStorage error:', err);
  }

  return null;
}

/**
 * Fetch status/path from the Vite backend API (falls back gracefully on GitHub Pages)
 */
export async function fetchStorageInfo(): Promise<{
  success: boolean;
  path: string;
  exists: boolean;
  size: number;
  lastModified: number | null;
} | null> {
  const hasBackend = await checkBackendAvailability();
  if (!hasBackend) {
    // Request persistence in browser mode
    requestPersistentStorage();
    return null;
  }
  try {
    const res = await fetch('/api/storage/info');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.path) {
      notify({
        filePath: data.path,
        fileSize: data.size || 0,
        lastSaved: data.lastModified ? new Date(data.lastModified) : currentStatus.lastSaved,
        isWebMode: false,
      });
    }
    return data;
  } catch (err: any) {
    console.warn('fetchStorageInfo error:', err);
    return null;
  }
}

/**
 * Load full state from the local disk file (if local backend is available)
 */
export async function loadFromDisk(): Promise<any | null> {
  const hasBackend = await checkBackendAvailability();
  if (!hasBackend) {
    return null;
  }
  try {
    const res = await fetch('/api/storage');
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      lastSavedString = JSON.stringify(json.data);
      notify({
        status: 'synced',
        filePath: json.path || currentStatus.filePath,
        fileSize: json.size || 0,
        lastSaved: json.lastModified ? new Date(json.lastModified) : new Date(),
        isWebMode: false,
      });
      return json.data;
    }
    return null;
  } catch (err: any) {
    console.warn('loadFromDisk error:', err);
    if (backendAvailable === true) {
      notify({ status: 'error', error: err.message });
    }
    return null;
  }
}

/**
 * Save state payload to disk file via POST /api/storage (or sync browser IndexedDB in web mode)
 */
export async function saveToDisk(payload: any): Promise<boolean> {
  if (isSyncPaused) return true;

  const hasBackend = await checkBackendAvailability();
  const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

  if (!hasBackend) {
    return await saveToBrowserStorage(payload);
  }

  try {
    // If payload is identical to what's already saved, skip disk write completely!
    if (lastSavedString !== null && bodyStr === lastSavedString) {
      notify({ status: 'synced' });
      return true;
    }

    notify({ status: 'saving' });
    const res = await fetch('/api/storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const resJson = await res.json();
    lastSavedString = bodyStr;
    notify({
      status: 'synced',
      lastSaved: new Date(),
      filePath: resJson.path || currentStatus.filePath,
      fileSize: resJson.size || bodyStr.length,
      error: undefined,
    });
    return true;
  } catch (err: any) {
    console.error('saveToDisk failed, falling back to browser storage:', err);
    const browserSaved = await saveToBrowserStorage(payload);
    if (browserSaved) {
      return true;
    }
    notify({
      status: 'error',
      error: err.message || 'Speichern fehlgeschlagen',
    });
    return false;
  }
}

/**
 * Debounced disk/IndexedDB saving to avoid thrashing I/O on every typing stroke
 */
export function debouncedSaveToDisk(payload: any, delayMs = 600): void {
  if (isSyncPaused) return;

  const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (lastSavedString !== null && bodyStr === lastSavedString) {
    return;
  }

  pendingDataToSave = payload;
  notify({ status: 'saving' });

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    if (pendingDataToSave !== null) {
      const toSave = pendingDataToSave;
      pendingDataToSave = null;
      await saveToDisk(toSave);
    }
  }, delayMs);
}

// Flush pending save before tab closes or reloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingDataToSave !== null && !isSyncPaused) {
      try {
        const bodyStr =
          typeof pendingDataToSave === 'string'
            ? pendingDataToSave
            : JSON.stringify(pendingDataToSave);
        if (bodyStr !== lastSavedString) {
          if (backendAvailable === true) {
            fetch('/api/storage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: bodyStr,
              keepalive: true,
            });
          } else {
            // Save to localStorage immediately on unload
            try {
              localStorage.setItem('learnmap-storage', bodyStr);
            } catch {
              // ignore quota
            }
          }
        }
      } catch {
        // ignore unload error
      }
    }
  });
}

/**
 * React hook to observe storage sync status
 */
export function useStorageStatus(): StorageStatus {
  const [status, setStatus] = useState<StorageStatus>(getStorageStatus());

  useEffect(() => {
    fetchStorageInfo();
    requestPersistentStorage();
    const unsub = subscribeStorageStatus(setStatus);
    return unsub;
  }, []);

  return status;
}

/**
 * Custom StateStorage adapter combining instant localStorage cache with disk file sync & IndexedDB
 */
export const diskAndLocalStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },

  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn('localStorage setItem failed (IndexedDB will persist data):', e);
    }

    if (isSyncPaused) return;

    try {
      const parsed = JSON.parse(value);
      debouncedSaveToDisk(parsed);
    } catch {
      debouncedSaveToDisk(value);
    }
  },

  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
