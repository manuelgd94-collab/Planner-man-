import { clsx } from 'clsx';
import type { DailyPlan } from '../../types';
import { formatDate, capitalizeFirst, isTodayUtil, isSameDayUtil } from '../../utils/dateUtils';
import { usePlanner } from '../../store/PlannerContext';

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-100 border-red-300 text-red-800',
  media: 'bg-amber-50 border-amber-200 text-amber-800',
  baja: 'bg-green-50 border-green-200 text-green-800',
};

interface WeekDayColumnProps {
  date: Date;
  plan: DailyPlan | null;
  onSelectDay: (date: Date) => void;
}

export function WeekDayColumn({ date, plan, onSelectDay }: WeekDayColumnProps) {
  const { state } = usePlanner();
  const isToday = isTodayUtil(date);
  const isSelected = isSameDayUtil(date, state.selectedDate);
  const tasks = plan?.tasks ?? [];
  const completedCount = tasks.filter(t => t.status === 'completada').length;

  return (
    <div
      className={clsx(
        'flex flex-col border border-border rounded-xl overflow-hidden bg-white min-h-[360px]',
        isToday && 'ring-2 ring-blue-400 ring-offset-1'
      )}
    >
      {/* Day header */}
      <button
        onClick={() => onSelectDay(date)}
        className={clsx(
          'px-3 py-2.5 text-left border-b border-border hover:bg-surface-tertiary transition-colors flex-shrink-0',
          isSelected && !isToday ? 'bg-gray-50' : 'bg-white'
        )}
      >
        <p className={clsx('text-[10px] font-semibold uppercase tracking-wide', isToday ? 'text-blue-600' : 'text-text-muted')}>
          {capitalizeFirst(formatDate(date, 'EEE'))}
        </p>
        <p className={clsx('text-xl font-bold leading-tight mt-0.5', isToday ? 'text-blue-600' : 'text-text-primary')}>
          {date.getDate()}
        </p>
        {tasks.length > 0 && (
          <p className="text-[10px] text-text-muted mt-0.5">
            {completedCount}/{tasks.length} tareas
          </p>
        )}
      </button>

      {/* Tasks list */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-text-muted text-center pt-6 px-2">Sin tareas</p>
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              className={clsx(
                'text-xs px-2 py-1 rounded border font-medium truncate',
                PRIORITY_COLORS[task.priority] ?? 'bg-gray-50 border-gray-200 text-gray-700',
                task.status === 'completada' && 'opacity-50 line-through'
              )}
              title={task.title}
            >
              {task.startTime && (
                <span className="text-[10px] opacity-60 mr-1">{task.startTime}</span>
              )}
              {task.title}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
