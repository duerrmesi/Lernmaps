import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { NodeAttachment } from '../types';
import { generateId } from './index';

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createThumbnail(dataUrl: string, maxDim = 300): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function fileToAttachment(file: File): Promise<NodeAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
    reader.onload = async () => {
      const fullData = reader.result as string;
      const id = generateId();
      const isImage = file.type.startsWith('image/');
      let thumb: string | undefined = undefined;

      if (isImage) {
        try {
          thumb = await createThumbnail(fullData);
        } catch {
          thumb = fullData;
        }
      }

      // Store full data in IndexedDB
      try {
        await idbSet(`attachment_${id}`, fullData);
      } catch (err) {
        console.warn('Could not save to IndexedDB, fallback to memory', err);
      }

      resolve({
        id,
        name: file.name,
        type: isImage ? 'image' : 'file',
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: thumb || (isImage ? fullData : undefined),
      });
    };
    reader.readAsDataURL(file);
  });
}

export async function getAttachmentFullData(att: NodeAttachment): Promise<string | null> {
  try {
    const stored = await idbGet<string>(`attachment_${att.id}`);
    if (stored) return stored;
  } catch (err) {
    console.warn('Error reading from IndexedDB', err);
  }
  return att.dataUrl || null;
}

export function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const parts = dataUrl.split(',');
  const byteString = atob(parts[1] || '');
  const u8arr = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    u8arr[i] = byteString.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mimeType });
}

export async function openFileAttachment(att: NodeAttachment): Promise<void> {
  const data = await getAttachmentFullData(att);
  if (!data) {
    alert('Datei konnte nicht geladen werden.');
    return;
  }

  try {
    const blob = dataUrlToBlob(data, att.mimeType || 'application/octet-stream');
    const blobUrl = URL.createObjectURL(blob);

    // Try to open in a new browser tab
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      // Fallback: download if popup blocker caught it
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Revoke object URL after delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error('Error opening file attachment', err);
  }
}

export async function deleteAttachmentData(id: string): Promise<void> {
  try {
    await idbDel(`attachment_${id}`);
  } catch (err) {
    console.warn('Error deleting attachment from IndexedDB', err);
  }
}
