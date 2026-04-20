import { useEffect, useState } from 'react';
import { Lock, Eye, RefreshCw } from 'lucide-react';
import { PlannerProvider, usePlanner } from './store/PlannerContext';
import { AppShell } from './components/layout/AppShell';
import { PinModal } from './components/auth/PinModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { hasPin, setLocked } from './store/auth';
import { cloudSyncToLocal, cloudUploadAll, needsBulkUpload, isCloudEnabled, clearLocalPlannerData } from './store/cloudSync';
import { onAuthChange, isAuthConfigured, type UserProfile } from './store/firebaseAuth';

// ── Legacy PIN lock screen (only used when Firebase Auth is NOT configured) ───

function LockScreen() {
  const { state, dispatch } = usePlanner();
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (state.locked && hasPin()) {
      setShowPin(true);
    }
  }, []);

  if (!state.locked) return null;

  function handleViewOnly() {
    setLocked(false);
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
        <button
          onClick={() => setShowPin(true)}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Ingresar PIN
        </button>
      ) : (
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

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

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

// ── Loading spinner ───────────────────────────────────────────────────────────

function LoadingScreen({ msg }: { msg: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-white">
      <RefreshCw size={28} className="text-gray-400 animate-spin" />
      <p className="text-sm text-text-secondary">{msg}</p>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

function App() {
  const authEnabled = isAuthConfigured();

  // Firebase Auth path
  const [authReady, setAuthReady] = useState(!authEnabled);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('Sincronizando datos…');

  // Legacy (no-auth) path
  const [legacySynced, setLegacySynced] = useState(!isCloudEnabled() || authEnabled);

  useEffect(() => {
    if (!authEnabled) {
      // Legacy: bulk-upload or sync without auth
      if (!isCloudEnabled()) return;
      if (hasPin() && needsBulkUpload()) {
        setSyncMsg('Subiendo historial a la nube… (solo esta vez)');
        cloudUploadAll().finally(() => setLegacySynced(true));
      } else {
        cloudSyncToLocal().finally(() => setLegacySynced(true));
      }
      return;
    }

    // Firebase Auth: listen for auth state changes
    const unsubscribe = onAuthChange(async (fbUser) => {
      if (fbUser) {
        // User just signed in — pull their data from Firestore
        setSyncing(true);
        setSyncMsg('Cargando tus datos…');
        try {
          await cloudSyncToLocal();
        } finally {
          setSyncing(false);
        }
        // Fetch profile from Firestore
        const { getProfile } = await import('./store/firebaseAuth');
        const profile = await getProfile(fbUser.uid);
        setCurrentUser(profile);
      } else {
        // Signed out — clear local data and reset user
        if (currentUser) {
          clearLocalPlannerData();
        }
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authEnabled]);

  // Show spinner during initial auth check
  if (!authReady) return <LoadingScreen msg="Verificando sesión…" />;

  // Show spinner during cloud sync after login
  if (syncing) return <LoadingScreen msg={syncMsg} />;

  // Firebase auth: show login when no user
  if (authEnabled && !currentUser) {
    return <LoginScreen onAuth={setCurrentUser} />;
  }

  // Legacy path: show spinner during initial sync
  if (!legacySynced) return <LoadingScreen msg={syncMsg} />;

  return (
    <PlannerProvider currentUser={currentUser}>
      <KeyboardShortcuts />
      {!authEnabled && <LockScreen />}
      <AppShell />
    </PlannerProvider>
  );
}

export default App;
