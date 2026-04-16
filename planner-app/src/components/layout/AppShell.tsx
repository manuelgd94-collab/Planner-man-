import { usePlanner } from '../../store/PlannerContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DailyPage } from '../../pages/DailyPage';
import { WeeklyPage } from '../../pages/WeeklyPage';
import { MonthlyPage } from '../../pages/MonthlyPage';
import { AnnualPage } from '../../pages/AnnualPage';
import { HistoryPage } from '../../pages/HistoryPage';

export function AppShell() {
  const { state } = usePlanner();
  const collapsed = state.settings.sidebarCollapsed;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar collapsed={collapsed} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden bg-surface-secondary">
          {state.view === 'diario' && <DailyPage />}
          {state.view === 'semanal' && <WeeklyPage />}
          {state.view === 'mensual' && <MonthlyPage />}
          {state.view === 'anual' && <AnnualPage />}
          {state.view === 'historial' && <HistoryPage />}
        </main>
      </div>
    </div>
  );
}
