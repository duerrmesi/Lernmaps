import QRCode from 'qrcode';
import { writeCloudPayload, readCloudPayload } from './cloudPayload';
import { getSerializableState } from '../store';

export interface TransferResult {
  code: string;
  formattedCode: string;
  expiresAt: Date;
  qrDataUrl: string;
  shareUrl: string;
}

/**
 * Generate a random 6-digit transfer code (e.g. '482915')
 */
function createRandom6DigitCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

/**
 * Uploads the current materials state to a temporary transfer slot
 * and generates a 6-digit code and QR-Code.
 */
export async function createDeviceTransfer(
  customPayload?: any,
  expiresInMinutes = 30
): Promise<TransferResult> {
  const code = createRandom6DigitCode();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const payload = customPayload || {
    state: getSerializableState(),
    version: 0,
    timestamp: Date.now(),
  };

  // Determine web app URL for the QR code
  // If running locally, prefer the public live web app URL so iPad can access it from outside localhost
  let baseUrl = 'https://duerrmesi.github.io/Lernmaps/';
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    baseUrl = `${window.location.origin}${window.location.pathname}`;
  }

  const shareUrl = `${baseUrl.replace(/\/+$/, '')}/#/transfer?code=${code}`;

  // Generate QR Code image (Data URL)
  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    width: 280,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });

  // Write payload to Firestore
  await writeCloudPayload('transfers', code, payload, {
    code,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    type: 'device-transfer',
  });

  const formattedCode = `${code.slice(0, 3)}-${code.slice(3)}`;

  return {
    code,
    formattedCode,
    expiresAt,
    qrDataUrl,
    shareUrl,
  };
}

/**
 * Fetches and validates a transfer code, returning the state payload
 */
export async function fetchDeviceTransfer(inputCode: string): Promise<any> {
  const cleanCode = inputCode.replace(/[^0-9]/g, '').trim();

  if (cleanCode.length !== 6) {
    throw new Error('Der Transfer-Code muss aus genau 6 Ziffern bestehen (z.B. 482-915).');
  }

  const res = await readCloudPayload('transfers', cleanCode);

  if (!res) {
    throw new Error('Ungültiger Code oder Transfer wurde nicht gefunden.');
  }

  const { data, meta } = res;

  if (meta.expiresAt) {
    const expDate = new Date(meta.expiresAt);
    if (expDate.getTime() < Date.now()) {
      throw new Error('Dieser Transfer-Code ist leider abgelaufen (Gültigkeit: 30 Minuten). Bitte am PC einen neuen Code generieren.');
    }
  }

  return data;
}
