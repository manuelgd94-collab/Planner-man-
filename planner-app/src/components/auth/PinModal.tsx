import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { hasPin, setPin, verifyPin, setLocked, removePin } from '../../store/auth';

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
  const isSetup = !hasPin();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (isSetup) {
      if (pin.length < 4) { setError('El PIN debe tener al menos 4 caracteres'); return; }
      if (pin !== confirmPin) { setError('Los PINs no coinciden'); return; }
      setPin(pin);
      setLocked(false);
      onUnlocked();
      onClose();
    } else {
      if (verifyPin(pin)) {
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

        {!isSetup && (
          <button
            type="button"
            onClick={() => { removePin(); setLocked(false); onUnlocked(); onClose(); }}
            className="w-full text-xs text-text-muted hover:text-red-500 transition-colors text-center mt-1"
          >
            Eliminar PIN (deshabilitar protección)
          </button>
        )}
      </form>
    </Modal>
  );
}
