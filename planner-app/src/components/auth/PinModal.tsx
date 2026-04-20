import { useState, useEffect, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { hasPin, setPin, setLocked, removePin, hashPin } from '../../store/auth';
import { isCloudEnabled, getCloudAdminPin, setCloudAdminPin } from '../../store/cloudSync';

interface PinModalProps {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

export function PinModal({ open, onClose, onUnlocked }: PinModalProps) {
  const [pin, setInputPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  // null = no cloud pin found (setup mode), string = existing hash, 'loading' = checking
  const [cloudHash, setCloudHash] = useState<string | null | 'loading'>('loading');

  const localHasPin = hasPin();

  useEffect(() => {
    if (!open) return;
    setError('');
    setInputPin('');
    setConfirmPin('');

    if (localHasPin || !isCloudEnabled()) {
      setCloudHash(null);
      return;
    }
    setCloudHash('loading');
    getCloudAdminPin().then(h => setCloudHash(h));
  }, [open, localHasPin]);

  // isSetup: true only when there's no PIN locally AND none in the cloud
  const isLoading = !localHasPin && isCloudEnabled() && cloudHash === 'loading';
  const isSetup = !localHasPin && cloudHash === null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (isSetup) {
      if (pin.length < 4) { setError('El PIN debe tener al menos 4 caracteres'); return; }
      if (pin !== confirmPin) { setError('Los PINs no coinciden'); return; }
      setPin(pin);
      setCloudAdminPin(hashPin(pin));
      setLocked(false);
      onUnlocked();
      onClose();
    } else {
      // Verify against local hash (owner) or cloud hash (other devices)
      const entered = hashPin(pin);
      const stored = localHasPin
        ? (localStorage.getItem('planner:auth:pin') ?? '')
        : (cloudHash as string);
      if (entered === stored) {
        if (!localHasPin) {
          // Save hash locally so this device can verify offline next time
          localStorage.setItem('planner:auth:pin', entered);
        }
        setLocked(false);
        onUnlocked();
        onClose();
      } else {
        setError('PIN incorrecto');
      }
    }
    setInputPin('');
    setConfirmPin('');
  }

  return (
    <Modal open={open} onClose={onClose} title={isSetup ? 'Configurar PIN de acceso' : 'Ingresar PIN'} size="sm">
      <div className="flex flex-col items-center mb-5">
        <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mb-3">
          <Lock size={22} className="text-white" />
        </div>
        <p className="text-sm text-text-secondary text-center">
          {isSetup
            ? 'Crea un PIN para proteger tu planificador. Sin el PIN, otros solo podrán visualizarlo.'
            : 'Ingresa tu PIN para desbloquear la edición.'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <RefreshCw size={20} className="text-gray-400 animate-spin" />
          <p className="text-xs text-text-muted">Verificando acceso…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              autoFocus
              type={show ? 'text' : 'password'}
              value={pin}
              onChange={e => setInputPin(e.target.value)}
              placeholder={isSetup ? 'Crear PIN' : 'PIN'}
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 pr-10 text-center tracking-widest text-lg"
            />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {isSetup && (
            <input
              type={show ? 'text' : 'password'}
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              placeholder="Confirmar PIN"
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 text-center tracking-widest text-lg"
            />
          )}

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <Button type="submit" variant="primary" className="w-full justify-center">
            {isSetup ? 'Crear PIN y desbloquear' : 'Desbloquear'}
          </Button>

          {!isSetup && localHasPin && (
            <button
              type="button"
              onClick={() => { removePin(); setLocked(false); onUnlocked(); onClose(); }}
              className="w-full text-xs text-text-muted hover:text-red-500 transition-colors text-center mt-1"
            >
              Eliminar PIN (deshabilitar protección)
            </button>
          )}
        </form>
      )}
    </Modal>
  );
}
