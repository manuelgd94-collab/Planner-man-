import { useEffect, useState } from 'react';
import { Lock, Eye, RefreshCw } from 'lucide-react';
import { PlannerProvider, usePlanner } from './store/PlannerContext';
import { AppShell } from './components/layout/AppShell';
import { PinModal } from './components/auth/PinModal';
import { hasPin, setLocked } from './store/auth';
import { cloudSyncToLocal, cloudUploadAll, needsBulkUpload, isCloudEnabled } from './store/cloudSync';

function LockScreen() {
  const { state, dispatch } = usePlanner();
  const [showPin, setShowPin] = useState(false);

  // Auto-open PIN modal if this browser has a PIN configured
  useEffect(() => {
    if (state.locked && hasPin()) {
      setShowPin(true);
    }
  }, []);

  if (!state.locked) return null;

  function handleViewOnly() {
    // Dismiss the lock screen overlay but do NOT unlock editing.
    // isReadOnly stays true because !hasPin() — viewer browsers have no PIN.
    setLocked(false); // persist so lock screen doesn't reappear on next visit
    dispatch({ type: 'SET_LOCKED', locked: false });
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center">
        <Lock size={28} className="text-white" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-text-primary">Planificador</h1>
        <p className="text-sm text-text-secondary mt-1 max-w-xs">
          {hasPin()
            ? 'Ingresa tu PIN para editar el planificador.'
            : 'Este planificador está protegido. Ingresa el PIN para editar.'}
        </p>
      </div>

      {hasPin() ? (
        /* Owner's browser: just show the PIN button */
        <button
          onClick={() => setShowPin(true)}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Ingresar PIN
        </button>
      ) : (
        /* Viewer's browser (no PIN): offer view-only or setup */
        <div className="flex flex-col gap-3 items-center w-full max-w-xs">
          <button
            onClick={handleViewOnly}
            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Eye size={16} />
            Ver planificador (solo lectura)
          </button>
          <button
            onClick={() => setShowPin(true)}
            className="w-full px-6 py-2.5 border border-border text-sm font-medium rounded-lg hover:bg-surface-tertiary transition-colors text-text-secondary"
          >
            Tengo un PIN de acceso
          </button>
        </div>
      )}

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
  const [synced, setSynced] = useState(!isCloudEnabled());
  const [syncMsg, setSyncMsg] = useState('Sincronizando datos…');

  useEffect(() => {
    if (!isCloudEnabled()) return;
    // Owner's PC (has PIN): upload all historical data to Firestore the first time
    if (hasPin() && needsBulkUpload()) {
      setSyncMsg('Subiendo historial a la nube… (solo esta vez)');
      cloudUploadAll().finally(() => setSynced(true));
    } else {
      // Readers and owner after first upload: pull from Firestore
      cloudSyncToLocal().finally(() => setSynced(true));
    }
  }, []);

  if (!synced) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-white">
        <RefreshCw size={28} className="text-gray-400 animate-spin" />
        <p className="text-sm text-text-secondary">{syncMsg}</p>
      </div>
    );
  }

  return (
    <PlannerProvider>
      <KeyboardShortcuts />
      <LockScreen />
      <AppShell />
    </PlannerProvider>
  );
}

export default App;
