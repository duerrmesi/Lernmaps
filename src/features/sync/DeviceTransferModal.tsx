import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Tablet,
  Laptop,
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useSyncModalStore } from './syncModalStore';
import {
  createDeviceTransfer,
  fetchDeviceTransfer,
  type TransferResult,
} from '../../services/transferService';
import { importFullState } from '../../store';

export const DeviceTransferModal: React.FC = () => {
  const { isTransferOpen, closeTransfer, initialCode } = useSyncModalStore();
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>(initialCode ? 'receive' : 'send');

  // Send state
  const [isGenerating, setIsGenerating] = useState(false);
  const [transferData, setTransferData] = useState<TransferResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Receive state
  const [inputCode, setInputCode] = useState(initialCode || '');
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [receiveSuccess, setReceiveSuccess] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
      setActiveTab('receive');
    }
  }, [initialCode]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    setSendError(null);
    try {
      const res = await createDeviceTransfer();
      setTransferData(res);
    } catch (err: any) {
      console.error('Transfer generation error:', err);
      setSendError(err.message || 'Fehler beim Erstellen des Transfer-Codes.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!transferData) return;
    navigator.clipboard.writeText(transferData.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!transferData) return;
    navigator.clipboard.writeText(transferData.shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleReceive = async () => {
    if (!inputCode.trim()) return;
    setIsReceiving(true);
    setReceiveError(null);
    setReceiveSuccess(false);

    try {
      const statePayload = await fetchDeviceTransfer(inputCode);
      const ok = importFullState(statePayload, true);
      if (ok) {
        setReceiveSuccess(true);
        setTimeout(() => {
          closeTransfer();
          setReceiveSuccess(false);
          setInputCode('');
        }, 1800);
      } else {
        throw new Error('Empfangene Daten konnten nicht importiert werden.');
      }
    } catch (err: any) {
      console.error('Transfer receive error:', err);
      setReceiveError(err.message || 'Fehler beim Abrufen der Daten.');
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <Modal
      isOpen={isTransferOpen}
      onClose={closeTransfer}
      title="Geräte-Transfer (PC ➔ iPad)"
      size="lg"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 pb-2.5 pt-1 text-center text-[12.5px] font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'send'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Laptop size={14} />
            <span>Vom PC senden (Code erstellen)</span>
          </button>
          <button
            onClick={() => setActiveTab('receive')}
            className={`flex-1 pb-2.5 pt-1 text-center text-[12.5px] font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'receive'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Tablet size={14} />
            <span>Am iPad empfangen (Code eingeben)</span>
          </button>
        </div>

        {/* Tab 1: SEND */}
        {activeTab === 'send' && (
          <div className="space-y-4 py-1">
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Übertrage deine Materialien mit einem kurzen 6-stelligen Code oder QR-Code direkt auf dein iPad.
              <strong className="text-text-primary font-medium"> Kein Login und kein Account nötig!</strong>
            </p>

            {sendError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11.5px] flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            {!transferData ? (
              <div className="py-6 flex flex-col items-center justify-center text-center bg-bg-secondary rounded-lg border border-border border-dashed p-6">
                <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-primary mb-3">
                  <Share2 size={18} />
                </div>
                <h4 className="text-[13px] font-medium text-text-primary mb-1">
                  Bereit zum Übertragen
                </h4>
                <p className="text-[11.5px] text-text-secondary max-w-sm mb-4">
                  Erstellt einen temporären Übertragungs-Code (30 Minuten gültig), mit dem du alle Mindmaps, Notizen und Karteikarten am iPad abrufen kannst.
                </p>
                <Button
                  variant="primary"
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className="px-4"
                >
                  {isGenerating ? 'Wird erstellt...' : 'Transfer-Code & QR-Code generieren'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 bg-bg-secondary p-4 rounded-lg border border-border">
                <div className="flex flex-col sm:flex-row items-center gap-5 justify-between">
                  {/* Left: Code Box */}
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div>
                      <span className="text-[10.5px] uppercase tracking-wider text-text-disabled font-semibold">
                        Dein 6-stelliger Transfer-Code:
                      </span>
                      <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                        <span className="text-3xl font-mono font-bold tracking-widest text-text-primary bg-bg-canvas px-3.5 py-1.5 rounded-md border border-border shadow-xs">
                          {transferData.formattedCode}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyCode}
                          title="Code kopieren"
                        >
                          {copiedCode ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </Button>
                      </div>
                    </div>

                    <div className="text-[11px] text-text-secondary flex items-center gap-1.5 justify-center sm:justify-start">
                      <Clock size={12} className="text-amber-500" />
                      <span>Gültig für 30 Minuten</span>
                    </div>

                    <div className="pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyLink}
                        className="text-[11px]"
                      >
                        {copiedLink ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span>Link kopiert!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Direktlink für iPad kopieren</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Right: QR-Code */}
                  <div className="flex flex-col items-center bg-white p-2.5 rounded-lg border border-border shadow-xs shrink-0">
                    <img
                      src={transferData.qrDataUrl}
                      alt="Transfer QR-Code"
                      className="w-36 h-36 rounded"
                    />
                    <span className="text-[10px] text-slate-500 font-medium mt-1 text-center">
                      Mit iPad-Kamera scannen
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-3 flex justify-between items-center text-[11px] text-text-secondary">
                  <span>Code am iPad in LearnMap unter „Empfangen“ eingeben.</span>
                  <Button variant="ghost" size="sm" onClick={handleGenerateCode}>
                    Neu generieren
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: RECEIVE */}
        {activeTab === 'receive' && (
          <div className="space-y-4 py-1">
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Gib hier den 6-stelligen Code ein, den du an deinem PC generiert hast, um alle Materialien auf dieses Gerät zu übertragen.
            </p>

            {receiveError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11.5px] flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{receiveError}</span>
              </div>
            )}

            {receiveSuccess && (
              <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Materialien erfolgreich übertragen und gespeichert! Fenster schließt sich...
                </span>
              </div>
            )}

            <div className="bg-bg-secondary p-5 rounded-lg border border-border space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  6-stelliger Transfer-Code:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={7}
                    placeholder="z.B. 482915"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleReceive();
                    }}
                    className="flex-1 px-3 py-2 text-xl font-mono tracking-widest bg-bg-canvas border border-border rounded focus-ring text-text-primary placeholder:text-text-disabled"
                  />
                  <Button
                    variant="primary"
                    onClick={handleReceive}
                    disabled={isReceiving || !inputCode.trim()}
                    className="px-5 text-[13px]"
                  >
                    {isReceiving ? 'Laden...' : 'Materialien abrufen'}
                  </Button>
                </div>
              </div>

              <div className="text-[11px] text-text-disabled leading-relaxed">
                Hinweis: Beim Import werden deine Projekte, Mindmaps, Notizen und Karteikarten aktualisiert und direkt lokal auf diesem Gerät gesichert.
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
