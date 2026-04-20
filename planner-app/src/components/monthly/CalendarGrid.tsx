import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDaysInMonthGrid, isSameDayUtil, isTodayUtil, toISODate, addMonthsUtil, subMonthsUtil, formatDate, capitalizeFirst } from '../../utils/dateUtils';
import { usePlanner } from '../../store/PlannerContext';
import { getItem, KEYS } from '../../store/localStorage';
import type { DailyPlan } from '../../types';
import { DIAS_SEMANA } from '../../utils/constants';

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-400',
  baja: 'bg-green-500',
};

const MOOD_COLORS: Record<number, string> = {
  1: 'bg-red-400',
  2: 'bg-orange-400',
  3: 'bg-gray-400',
  4: 'bg-blue-400',
  5: 'bg-green-400',
};

export function CalendarGrid() {
  const { state, dispatch } = usePlanner();
  const { selectedDate } = state;
  const gridDays = getDaysInMonthGrid(selectedDate);

  const prevMonth = () => dispatch({ type: 'SET_DATE', date: subMonthsUtil(selectedDate, 1) });
  const nextMonth = () => dispatch({ type: 'SET_DATE', date: addMonthsUtil(selectedDate, 1) });

  const monthLabel = capitalizeFirst(formatDate(selectedDate, 'MMMM yyyy'));

  function getDayData(date: Date) {
    const plan = getItem<DailyPlan>(KEYS.daily(toISODate(date)));
    const tasks = plan?.tasks ?? [];
    const planned     = tasks.filter(t => !t.rescheduledFrom);
    const rescheduled = tasks.filter(t => !!t.rescheduledFrom);
    const allDone = tasks.length > 0 && tasks.every(t => t.status === 'completada');
    return { tasks, planned, rescheduled, allDone, mood: plan?.mood ?? null };
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-text-primary">{monthLabel}</h2>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Estado de ánimo:</span>
        {([1,2,3,4,5] as const).map(m => {
          const labels: Record<number,string> = { 1:'Mal', 2:'Regular', 3:'Normal', 4:'Bien', 5:'Excelente' };
          return (
            <span key={m} className="flex items-center gap-1 text-[10px] text-text-muted">
              <span className={clsx('w-2 h-2 rounded-full', MOOD_COLORS[m])} />
              {labels[m]}
            </span>
          );
        })}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-xs font-medium text-text-muted py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {gridDays.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = isTodayUtil(day);
          const isSelected = isSameDayUtil(day, selectedDate);
          const { tasks, planned, rescheduled, allDone, mood } = getDayData(day);
          const hasTasks = tasks.length > 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => dispatch({ type: 'SET_DATE', date: day })}
              className={clsx(
                'relative flex flex-col items-center py-1.5 rounded-lg transition-all min-h-[52px]',
                isSelected && !isToday ? 'bg-surface-secondary ring-1 ring-border' : '',
                isToday ? 'bg-gray-900 text-white' : 'hover:bg-surface-secondary text-text-primary',
              )}
            >
              {/* Mood dot — top-right corner */}
              {mood && (
                <span className={clsx('absolute top-1 right-1 w-1.5 h-1.5 rounded-full', MOOD_COLORS[mood])} />
              )}

              <span className={clsx('text-sm font-medium', isToday ? 'text-white' : '')}>
                {day.getDate()}
              </span>

              {/* Task dots */}
              {hasTasks && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[36px]">
                  {allDone ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  ) : (
                    <>
                      {planned.slice(0, 2).map((t, ti) => (
                        <div key={ti} className={clsx('w-1.5 h-1.5 rounded-full', PRIORITY_COLORS[t.priority] ?? 'bg-gray-400')} />
                      ))}
                      {rescheduled.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-sm bg-orange-400" title="Reprogramadas" />
                      )}
                    </>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
