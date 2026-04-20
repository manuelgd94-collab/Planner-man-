import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, PanelLeft, Lock, Unlock, Eye } from 'lucide-react';
import { clsx } from 'clsx';
import { usePlanner } from '../../store/PlannerContext';
import { formatDate, capitalizeFirst, addDaysUtil, subDaysUtil, addMonthsUtil, subMonthsUtil, getWeekDays } from '../../utils/dateUtils';
import { PinModal } from '../auth/PinModal';
import { setLocked } from '../../store/auth';

export function Header() {
  const { state, dispatch, isReadOnly } = usePlanner();
  const { view, selectedDate } = state;
  const [showPin, setShowPin] = useState(false);

  const weekDays = useMemo(() => view === 'semanal' ? getWeekDays(selectedDate) : null, [view, selectedDate]);

  let title = '';
  let subtitle = '';

  if (view === 'diario') {
    title = capitalizeFirst(formatDate(selectedDate, "EEEE d 'de' MMMM"));
    subtitle = String(selectedDate.getFullYear());
  } else if (view === 'semanal') {
    if (weekDays) {
      const first = weekDays[0];
      const last = weekDays[6];
      const sameMonth = first.getMonth() === last.getMonth();
      title = sameMonth
        ? `${first.getDate()} – ${last.getDate()} de ${capitalizeFirst(formatDate(first, 'MMMM'))}`
        : `${first.getDate()} ${capitalizeFirst(formatDate(first, 'MMM'))} – ${last.getDate()} ${capitalizeFirst(formatDate(last, 'MMM'))}`;
    }
    subtitle = `Semana · ${selectedDate.getFullYear()}`;
  } else if (view === 'mensual') {
    title = capitalizeFirst(formatDate(selectedDate, 'MMMM yyyy'));
    subtitle = 'Vista mensual';
  } else if (view === 'anual') {
    title = String(selectedDate.getFullYear());
    subtitle = 'Vista anual';
  } else if (view === 'estadisticas') {
    title = 'Estadísticas';
    subtitle = 'Productividad y hábitos';
  } else {
    title = 'Historial';
    subtitle = 'Registro de actividad';
  }

  function goBack() {
    if (view === 'diario') dispatch({ type: 'SET_DATE', date: subDaysUtil(selectedDate, 1) });
    else if (view === 'semanal') dispatch({ type: 'SET_DATE', date: subDaysUtil(selectedDate, 7) });
    else if (view === 'mensual') dispatch({ type: 'SET_DATE', date: subMonthsUtil(selectedDate, 1) });
    else if (view === 'anual') {
      const d = new Date(selectedDate); d.setFullYear(d.getFullYear() - 1);
      dispatch({ type: 'SET_DATE', date: d });
    }
  }

  function goForward() {
    if (view === 'diario') dispatch({ type: 'SET_DATE', date: addDaysUtil(selectedDate, 1) });
    else if (view === 'semanal') dispatch({ type: 'SET_DATE', date: addDaysUtil(selectedDate, 7) });
    else if (view === 'mensual') dispatch({ type: 'SET_DATE', date: addMonthsUtil(selectedDate, 1) });
    else if (view === 'anual') {
      const d = new Date(selectedDate); d.setFullYear(d.getFullYear() + 1);
      dispatch({ type: 'SET_DATE', date: d });
    }
  }

  function handleLockToggle() {
    if (isReadOnly) {
      setShowPin(true);
    } else {
      setLocked(true);
      dispatch({ type: 'SET_LOCKED', locked: true });
    }
  }

  return (
    <>
      <header className="flex items-center justify-between px-3 py-2.5 md:px-6 md:py-3.5 border-b border-border bg-white flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="hidden md:flex p-1.5 rounded hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors"
          >
            <PanelLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm md:text-base font-semibold text-text-primary leading-tight">{title}</h1>
            <p className="text-xs text-text-muted leading-none">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {isReadOnly && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <Eye size={12} />
              <span className="hidden sm:inline">Solo lectura</span>
            </span>
          )}

          <button
            onClick={handleLockToggle}
            title={isReadOnly ? 'Desbloquear edición' : 'Bloquear — modo visualización'}
            className={clsx(
              'p-1.5 rounded transition-colors',
              isReadOnly
                ? 'text-amber-500 hover:bg-amber-50'
                : 'text-text-muted hover:bg-surface-secondary hover:text-text-primary'
            )}
          >
            {isReadOnly ? <Lock size={16} /> : <Unlock size={16} />}
          </button>

          {view !== 'historial' && (
            <>
              <button onClick={goBack} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={goForward} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary transition-colors">
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      <PinModal
        open={showPin}
        onClose={() => setShowPin(false)}
        onUnlocked={() => dispatch({ type: 'SET_LOCKED', locked: false })}
      />
    </>
  );
}
