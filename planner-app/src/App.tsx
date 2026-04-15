import { useEffect } from 'react';
import { PlannerProvider, usePlanner } from './store/PlannerContext';
import { AppShell } from './components/layout/AppShell';

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
      <AppShell />
    </PlannerProvider>
  );
}

export default App;
