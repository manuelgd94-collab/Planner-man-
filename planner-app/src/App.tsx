import { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { PlannerProvider, usePlanner } from './store/PlannerContext';
import { AppShell } from './components/layout/AppShell';
import { PinModal } from './components/auth/PinModal';
import { hasPin } from './store/auth';
import { useState } from 'react';

function LockScreen() {
  const { state, dispatch } = usePlanner();
  const [showPin, setShowPin] = useState(false);

  // Auto-show PIN modal if PIN exists and app is locked
  useEffect(() => {
    if (state.locked && hasPin()) {
      setShowPin(true);
    }
  }, []);

  if (!state.locked) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center">
        <Lock size={28} className="text-white" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-text-primary">Planificador</h1>
        <p className="text-sm text-text-secondary mt-1">
          {hasPin() ? 'Ingresa tu PIN para continuar' : 'Bloqueado'}
        </p>
      </div>
      <button
        onClick={() => setShowPin(true)}
        className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
      >
        {hasPin() ? 'Ingresar PIN' : 'Desbloquear'}
      </button>

      <PinModal
        open={showPin}
        onClose={() => setShowPin(false)}
        onUnlocked={() => dispatch({ type: 'SET_LOCKED', locked: false })}
      />
    </div>
  );
}

function KeyboardShortcuts() {
  const { dispatch } = usePlanner();
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'd') { e.preventDefault(); dispatch({ type: 'SET_VIEW', view: 'diario' }); }
        if (e.key === 'm') { e.preventDefault(); dispatch({ type: 'SET_VIEW', view: 'mensual' }); }
        if (e.key === 'a') { e.preventDefault(); dispatch({ type: 'SET_VIEW', view: 'anual' }); }
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [dispatch]);
  return null;
}

function App() {
  return (
    <PlannerProvider>
      <KeyboardShortcuts />
      <LockScreen />
      <AppShell />
    </PlannerProvider>
  );
}

export default App;
