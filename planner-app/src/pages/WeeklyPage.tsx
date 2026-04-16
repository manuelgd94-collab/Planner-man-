import { useMemo } from 'react';
import { usePlanner } from '../store/PlannerContext';
import { getWeekDays, toISODate, formatDate, capitalizeFirst } from '../utils/dateUtils';
import { getItem, KEYS } from '../store/localStorage';
import type { DailyPlan } from '../types';
import { WeekDayColumn } from '../components/weekly/WeekDayColumn';

export function WeeklyPage() {
  const { state, dispatch } = usePlanner();
  const weekDays = useMemo(() => getWeekDays(state.selectedDate), [state.selectedDate]);

  const plans = useMemo(() => {
    return weekDays.map(day => getItem<DailyPlan>(KEYS.daily(toISODate(day))));
  }, [weekDays]);

  const weekLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const sameMonth = first.getMonth() === last.getMonth();
    if (sameMonth) {
      return `${first.getDate()} – ${last.getDate()} de ${capitalizeFirst(formatDate(first, 'MMMM yyyy'))}`;
    }
    return `${first.getDate()} ${capitalizeFirst(formatDate(first, 'MMM'))} – ${last.getDate()} ${capitalizeFirst(formatDate(last, 'MMM yyyy'))}`;
  }, [weekDays]);

  function handleSelectDay(date: Date) {
    dispatch({ type: 'SET_DATE', date });
    dispatch({ type: 'SET_VIEW', view: 'diario' });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6">
        <p className="text-xs text-text-muted mb-4">{weekLabel} · Haz clic en un día para editarlo</p>
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => (
            <WeekDayColumn
              key={day.toISOString()}
              date={day}
              plan={plans[i]}
              onSelectDay={handleSelectDay}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
