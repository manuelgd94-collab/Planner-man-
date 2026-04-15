import { ChevronLeft, ChevronRight, PanelLeft } from 'lucide-react';
import { usePlanner } from '../../store/PlannerContext';
import { formatDate, capitalizeFirst, addDaysUtil, subDaysUtil, addMonthsUtil, subMonthsUtil } from '../../utils/dateUtils';

export function Header() {
  const { state, dispatch } = usePlanner();
  const { view, selectedDate } = state;

  let title = '';
  let subtitle = '';

  if (view === 'diario') {
    title = capitalizeFirst(formatDate(selectedDate, "EEEE d 'de' MMMM"));
    subtitle = String(selectedDate.getFullYear());
  } else if (view === 'mensual') {
    title = capitalizeFirst(formatDate(selectedDate, 'MMMM yyyy'));
    subtitle = 'Vista mensual';
  } else {
    title = String(selectedDate.getFullYear());
    subtitle = 'Vista anual';
  }

  function goBack() {
    if (view === 'diario') dispatch({ type: 'SET_DATE', date: subDaysUtil(selectedDate, 1) });
    else if (view === 'mensual') dispatch({ type: 'SET_DATE', date: subMonthsUtil(selectedDate, 1) });
    else {
      const d = new Date(selectedDate);
      d.setFullYear(d.getFullYear() - 1);
      dispatch({ type: 'SET_DATE', date: d });
    }
  }

  function goForward() {
    if (view === 'diario') dispatch({ type: 'SET_DATE', date: addDaysUtil(selectedDate, 1) });
    else if (view === 'mensual') dispatch({ type: 'SET_DATE', date: addMonthsUtil(selectedDate, 1) });
    else {
      const d = new Date(selectedDate);
      d.setFullYear(d.getFullYear() + 1);
      dispatch({ type: 'SET_DATE', date: d });
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-white flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="p-1.5 rounded hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors"
          title="Alternar barra lateral"
        >
          <PanelLeft size={18} />
        </button>

        <div>
          <h1 className="text-base font-semibold text-text-primary leading-tight">{title}</h1>
          <p className="text-xs text-text-muted leading-none">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={goBack} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary transition-colors">
          <ChevronLeft size={16} />
        </button>
        <button onClick={goForward} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </header>
  );
}
