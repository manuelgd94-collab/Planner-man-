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

export function CalendarGrid() {
  const { state, dispatch } = usePlanner();
  const { selectedDate } = state;
  const gridDays = getDaysInMonthGrid(selectedDate);

  const prevMonth = () => dispatch({ type: 'SET_DATE', date: subMonthsUtil(selectedDate, 1) });
  const nextMonth = () => dispatch({ type: 'SET_DATE', date: addMonthsUtil(selectedDate, 1) });

  const monthLabel = capitalizeFirst(formatDate(selectedDate, 'MMMM yyyy'));

  function getDayData(date: Date): { tasks: DailyPlan['tasks']; allDone: boolean } {
    const plan = getItem<DailyPlan>(KEYS.daily(toISODate(date)));
    const tasks = plan?.tasks ?? [];
    return { tasks, allDone: tasks.length > 0 && tasks.every(t => t.status === 'completada') };
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
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
          const { tasks, allDone } = getDayData(day);
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
              <span className={clsx('text-sm font-medium', isToday ? 'text-white' : '')}>
                {day.getDate()}
              </span>

              {/* Task dots */}
              {hasTasks && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[36px]">
                  {allDone ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  ) : (
                    tasks.slice(0, 3).map((t, ti) => (
                      <div key={ti} className={clsx('w-1.5 h-1.5 rounded-full', PRIORITY_COLORS[t.priority] ?? 'bg-gray-400')} />
                    ))
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
