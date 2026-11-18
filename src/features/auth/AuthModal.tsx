import React, { useState } from 'react';
import {
  Check,
  AlertCircle,
  LogOut,
  UploadCloud,
  DownloadCloud,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useSyncModalStore } from '../sync/syncModalStore';
import {
  useCloudSync,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logoutUser,
  saveToCloud,
  loadFromCloud,
} from '../../services/firebaseAuthSync';

export const AuthModal: React.FC = () => {
  const { isAuthOpen, closeAuth } = useSyncModalStore();
  const { user, lastSyncedAt, error } = useCloudSync();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      closeAuth();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentifizierungsfehler';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Falsche E-Mail-Adresse oder falsches Passwort.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Für diese E-Mail-Adresse existiert bereits ein Account.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      }
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await loginWithGoogle();
      closeAuth();
    } catch (err: any) {
      console.error('Google login error:', err);
      setFormError(err.message || 'Fehler beim Google-Login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSave = async () => {
    setIsSubmitting(true);
    const ok = await saveToCloud();
    setIsSubmitting(false);
    if (ok) {
      setActionMsg('Erfolgreich in der Cloud gespeichert!');
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handleManualLoad = async () => {
    if (!confirm('Möchtest du die Daten aus der Cloud laden? Deine lokalen Änderungen werden mit dem Cloud-Stand synchronisiert.')) return;
    setIsSubmitting(true);
    const ok = await loadFromCloud();
    setIsSubmitting(false);
    if (ok) {
      setActionMsg('Daten erfolgreich aus der Cloud synchronisiert!');
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  return (
    <Modal
      isOpen={isAuthOpen}
      onClose={closeAuth}
      title={user ? 'Dein LearnMap Cloud-Konto' : 'Cloud-Synchronisation & Login'}
      size="md"
    >
      <div className="space-y-4">
        {/* If user is logged in */}
        {user ? (
          <div className="space-y-4 py-1">
            <div className="bg-bg-secondary p-4 rounded-lg border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
                {user.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text-primary truncate">
                  {user.displayName || user.email}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                  <ShieldCheck size={12} />
                  <span>Cloud-Synchronisation aktiv</span>
                </div>
              </div>
            </div>

            {actionMsg && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] flex items-center gap-2">
                <Check size={14} className="shrink-0" />
                <span>{actionMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[11.5px] text-text-secondary leading-relaxed">
                Deine Lernmaterialien werden automatisch im Hintergrund synchronisiert, sobald du etwas bearbeitest. Du kannst den Sync auch manuell anstoßen:
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="secondary"
                  onClick={handleManualSave}
                  disabled={isSubmitting}
                  className="w-full text-[12px] h-8"
                >
                  <UploadCloud size={13} />
                  <span>Jetzt hochladen</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleManualLoad}
                  disabled={isSubmitting}
                  className="w-full text-[12px] h-8"
                >
                  <DownloadCloud size={13} />
                  <span>Aus Cloud laden</span>
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-center text-[11.5px]">
              <span className="text-text-disabled">
                {lastSyncedAt
                  ? `Letzter Sync: ${lastSyncedAt.toLocaleTimeString()}`
                  : 'Bereit zum Synchronisieren'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logoutUser();
                }}
                className="text-danger hover:text-danger"
              >
                <LogOut size={12} />
                <span>Abmelden</span>
              </Button>
            </div>
          </div>
        ) : (
          /* If user is logged out */
          <div className="space-y-4 py-1">
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                }}
                className={`flex-1 pb-2 pt-1 text-center text-[12.5px] font-medium border-b-2 transition-colors ${
                  mode === 'login'
                    ? 'border-text-primary text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Anmelden
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setFormError(null);
                }}
                className={`flex-1 pb-2 pt-1 text-center text-[12.5px] font-medium border-b-2 transition-colors ${
                  mode === 'register'
                    ? 'border-text-primary text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Konto erstellen
              </button>
            </div>

            <p className="text-[12px] text-text-secondary leading-relaxed">
              Melde dich an, um deine Mindmaps, Notizen und Karteikarten automatisch zwischen PC, iPad und weiteren Geräten synchron zu halten.
            </p>

            {(formError || error) && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11.5px] flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1">
                  E-Mail
                </label>
                <div className="relative">
                  <Mail
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@beispiel.de"
                    className="w-full pl-8 pr-3 py-1.5 text-[12.5px] bg-bg-canvas border border-border rounded focus-ring text-text-primary placeholder:text-text-disabled"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1">
                  Passwort
                </label>
                <div className="relative">
                  <Lock
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled"
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mindestens 6 Zeichen"
                    className="w-full pl-8 pr-3 py-1.5 text-[12.5px] bg-bg-canvas border border-border rounded focus-ring text-text-primary placeholder:text-text-disabled"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting}
                className="w-full h-8 text-[12.5px] mt-2"
              >
                {isSubmitting
                  ? 'Bitte warten...'
                  : mode === 'login'
                  ? 'Anmelden'
                  : 'Konto erstellen & synchronisieren'}
              </Button>
            </form>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10.5px] uppercase">
                <span className="bg-bg-canvas px-2 text-text-disabled">Oder</span>
              </div>
            </div>

            <Button
              variant="secondary"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full h-8 text-[12.5px]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Mit Google anmelden</span>
            </Button>

            <div className="border-t border-border pt-3 flex justify-between items-center text-[11px] text-text-disabled">
              <span>Keine Lust auf ein Konto?</span>
              <button
                type="button"
                onClick={closeAuth}
                className="text-text-secondary hover:text-text-primary underline"
              >
                Offline / als Gast weiterarbeiten
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
