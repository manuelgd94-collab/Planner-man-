import { clsx } from 'clsx';
import { Calendar, CalendarDays, CalendarRange, LayoutDashboard, BarChart2, History, ShieldCheck } from 'lucide-react';
import { usePlanner } from '../../store/PlannerContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DailyPage } from '../../pages/DailyPage';
import { WeeklyPage } from '../../pages/WeeklyPage';
import { MonthlyPage } from '../../pages/MonthlyPage';
import { AnnualPage } from '../../pages/AnnualPage';
import { HistoryPage } from '../../pages/HistoryPage';
import { StatsPage } from '../../pages/StatsPage';
import { AdminPage } from '../../pages/AdminPage';
import type { ViewType } from '../../types';

const BASE_BOTTOM_NAV: { view: ViewType; label: string; icon: React.ElementType }[] = [
  { view: 'diario',       label: 'Diario',    icon: Calendar },
  { view: 'semanal',      label: 'Semanal',   icon: CalendarRange },
  { view: 'mensual',      label: 'Mensual',   icon: CalendarDays },
  { view: 'anual',        label: 'Anual',     icon: LayoutDashboard },
  { view: 'estadisticas', label: 'Stats',     icon: BarChart2 },
  { view: 'historial',    label: 'Historial', icon: History },
];

function BottomNav() {
  const { state, dispatch, isAdmin } = usePlanner();
  const items = isAdmin
    ? [...BASE_BOTTOM_NAV, { view: 'admin' as ViewType, label: 'Admin', icon: ShieldCheck }]
    : BASE_BOTTOM_NAV;
  return (
    <nav className="md:hidden flex border-t border-border bg-white flex-shrink-0 overflow-x-auto">
      {items.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          onClick={() => dispatch({ type: 'SET_VIEW', view })}
          className={clsx(
            'flex-1 flex flex-col items-center py-2 gap-0.5 text-[9px] transition-colors min-w-[52px]',
            state.view === view ? 'text-gray-900' : 'text-text-muted'
          )}
        >
          <Icon size={19} strokeWidth={state.view === view ? 2.5 : 1.5} />
          <span className={state.view === view ? 'font-semibold' : ''}>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { state } = usePlanner();
  const collapsed = state.settings.sidebarCollapsed;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar: hidden on mobile, shown on md+ */}
      <div className="hidden md:flex h-full">
        <Sidebar collapsed={collapsed} />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden bg-surface-secondary">
          {state.view === 'diario'       && <DailyPage />}
          {state.view === 'semanal'      && <WeeklyPage />}
          {state.view === 'mensual'      && <MonthlyPage />}
          {state.view === 'anual'        && <AnnualPage />}
          {state.view === 'estadisticas' && <StatsPage />}
          {state.view === 'historial'    && <HistoryPage />}
          {state.view === 'admin'        && <AdminPage />}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
