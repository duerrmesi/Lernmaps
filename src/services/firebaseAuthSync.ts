// firebaseAuthSync – Handles Firebase Auth state syncing and cloud persistence
import { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
  type User,
} from './firebase';
import { writeCloudPayload, readCloudPayload } from './cloudPayload';
import { getSerializableState, importFullState, useStore } from '../store';
import { syncLocalPdfsToCloud } from './documentCloudSync';

export interface CloudSyncState {
  user: User | null;
  loading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: Date | null;
  error: string | null;
}

let syncState: CloudSyncState = {
  user: null,
  loading: true,
  syncStatus: 'idle',
  lastSyncedAt: null,
  error: null,
};

const listeners = new Set<(state: CloudSyncState) => void>();

function notify(updates: Partial<CloudSyncState>) {
  syncState = { ...syncState, ...updates };
  listeners.forEach((l) => {
    try {
      l(syncState);
    } catch {
      // ignore listener error
    }
  });
}

export function getCloudSyncState(): CloudSyncState {
  return syncState;
}

export function subscribeCloudSyncState(listener: (state: CloudSyncState) => void): () => void {
  listeners.add(listener);
  listener(syncState);
  return () => {
    listeners.delete(listener);
  };
}

export function useCloudSync(): CloudSyncState {
  const [state, setState] = useState<CloudSyncState>(syncState);
  useEffect(() => {
    return subscribeCloudSyncState(setState);
  }, []);
  return state;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isInternalLoading = false;

/**
 * Upload current materials to user's private cloud document
 */
/**
 * Upload current materials to user's private cloud document.
 * Returns true on success, false on failure.
 */
export async function saveToCloud(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  notify({ syncStatus: 'syncing', error: null });
  try {
    const payload = {
      state: getSerializableState(),
      version: 0,
      timestamp: Date.now(),
      updatedAt: new Date().toISOString(),
    };

    await writeCloudPayload('users', user.uid, payload, {
      userEmail: user.email,
      lastUpdated: new Date().toISOString(),
    });

    notify({
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
      error: null,
    });
    return true;
  } catch (err: any) {
    console.error('Failed to save to cloud:', err);
    notify({
      syncStatus: 'error',
      error: err.message || 'Fehler beim Speichern in der Cloud',
    });
    return false;
  }
}

/**
 * Download and import user's materials from cloud
 */
export async function loadFromCloud(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  notify({ syncStatus: 'syncing', error: null });
  try {
    isInternalLoading = true;
    const res = await readCloudPayload('users', user.uid);
    if (!res || !res.data) {
      notify({ syncStatus: 'idle', error: null });
      return false;
    }

    const ok = importFullState(res.data, true);
    if (ok) {
      notify({
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        error: null,
      });
      return true;
    } else {
      throw new Error('Daten konnten nicht im lokalen Speicher wiederhergestellt werden.');
    }
  } catch (err: any) {
    console.error('Failed to load from cloud:', err);
    notify({
      syncStatus: 'error',
      error: err.message || 'Fehler beim Laden aus der Cloud',
    });
    return false;
  } finally {
    isInternalLoading = false;
  }
}

/**
 * Initialize Auth listener and auto-sync
 */
export function initAuthSync(): () => void {
  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    notify({ user, loading: false, error: null });

    if (user) {
      // Upon login, check if cloud has data
      try {
        const cloudData = await readCloudPayload('users', user.uid);
        const currentState = getSerializableState();
        const hasLocalProjects = Object.keys(currentState.projects || {}).length > 0;

        if (cloudData && cloudData.data) {
          // If cloud has data, load it!
          isInternalLoading = true;
          importFullState(cloudData.data, true);
          isInternalLoading = false;
          notify({ syncStatus: 'synced', lastSyncedAt: new Date() });
        } else if (hasLocalProjects) {
          // If cloud has no data yet, but user has local projects: initial upload to cloud
          await saveToCloud();
        }

        // Sync any local PDFs to cloud in background
        syncLocalPdfsToCloud().catch(console.warn);
      } catch (err) {
        console.warn('Initial cloud check on login failed:', err);
      }
    } else {
      notify({ syncStatus: 'idle', lastSyncedAt: null });
    }
  });

  // Debounced auto-save on store changes when logged in
  const unsubscribeStore = useStore.subscribe(() => {
    if (isInternalLoading) return;
    if (!auth.currentUser) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      saveToCloud();
    }, 3000); // 3 seconds debounce after editing
  });

  return () => {
    unsubscribeAuth();
    unsubscribeStore();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  notify({ error: null });
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function registerWithEmail(email: string, pass: string): Promise<User> {
  notify({ error: null });
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function loginWithGoogle(): Promise<User> {
  notify({ error: null });
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
  notify({ user: null, syncStatus: 'idle', lastSyncedAt: null, error: null });
}
