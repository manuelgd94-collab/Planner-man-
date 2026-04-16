import { Calendar, CalendarDays, LayoutDashboard, ChevronLeft, ChevronRight, CalendarCheck, History, CalendarRange } from 'lucide-react';
import { clsx } from 'clsx';
import type { ViewType } from '../../types';
import { usePlanner } from '../../store/PlannerContext';
import { getDaysInMonthGrid, isSameDayUtil, isTodayUtil, addMonthsUtil, subMonthsUtil } from '../../utils/dateUtils';
import { DIAS_SEMANA, MESES } from '../../utils/constants';
import { ExportImport } from '../settings/ExportImport';

const NAV_ITEMS: { view: ViewType; label: string; icon: React.ElementType }[] = [
  { view: 'diario', label: 'Diario', icon: Calendar },
  { view: 'semanal', label: 'Semanal', icon: CalendarRange },
  { view: 'mensual', label: 'Mensual', icon: CalendarDays },
  { view: 'anual', label: 'Anual', icon: LayoutDashboard },
  { view: 'historial', label: 'Historial', icon: History },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { state, dispatch } = usePlanner();

  const miniCalendarMonth = state.selectedDate;
  const gridDays = getDaysInMonthGrid(miniCalendarMonth);
  const monthLabel = `${MESES[miniCalendarMonth.getMonth()]} ${miniCalendarMonth.getFullYear()}`;

  function goToday() {
    dispatch({ type: 'SET_DATE', date: new Date() });
    dispatch({ type: 'SET_VIEW', view: 'diario' });
  }

  return (
    <div className={clsx(
      'h-full bg-sidebar border-r border-border flex flex-col transition-all duration-300 overflow-hidden',
      collapsed ? 'w-14' : 'w-60'
    )}>
      {/* Logo */}
      <div className={clsx('flex items-center gap-2.5 px-4 py-4 border-b border-border flex-shrink-0', collapsed && 'justify-center px-0')}>
        <CalendarCheck size={20} className="text-gray-900 flex-shrink-0" />
        {!collapsed && <span className="font-bold text-text-primary text-base">Planificador</span>}
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 px-2 py-3">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => dispatch({ type: 'SET_VIEW', view })}
            className={clsx(
              'flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-sm font-medium',
              state.view === view
                ? 'bg-gray-900 text-white'
                : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && label}
          </button>
        ))}
      </nav>

      {/* Today button */}
      {!collapsed && (
        <div className="px-4 mb-3">
          <button
            onClick={goToday}
            className="w-full text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg py-1.5 hover:bg-surface-tertiary transition-colors"
          >
            Hoy
          </button>
        </div>
      )}

      {/* Export / Import */}
      {!collapsed && (
        <div className="px-3 pb-2 border-t border-border pt-2 flex-shrink-0">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Datos</p>
          <ExportImport />
        </div>
      )}

      {/* Mini calendar */}
      {!collapsed && (
        <div className="px-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary">{monthLabel}</span>
            <div className="flex gap-0.5">
              <button
                onClick={() => dispatch({ type: 'SET_DATE', date: subMonthsUtil(state.selectedDate, 1) })}
                className="p-0.5 rounded hover:bg-surface-tertiary text-text-muted"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_DATE', date: addMonthsUtil(state.selectedDate, 1) })}
                className="p-0.5 rounded hover:bg-surface-tertiary text-text-muted"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-[10px] text-text-muted py-0.5">{d.charAt(0)}</div>
            ))}
            {gridDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const isToday = isTodayUtil(day);
              const isSelected = isSameDayUtil(day, state.selectedDate);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    dispatch({ type: 'SET_DATE', date: day });
                    if (state.view === 'anual') dispatch({ type: 'SET_VIEW', view: 'diario' });
                  }}
                  className={clsx(
                    'w-full aspect-square text-[11px] rounded flex items-center justify-center transition-colors',
                    isToday ? 'bg-gray-900 text-white font-bold' :
                    isSelected ? 'bg-surface-tertiary text-text-primary font-medium' :
                    'text-text-secondary hover:bg-surface-tertiary'
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
