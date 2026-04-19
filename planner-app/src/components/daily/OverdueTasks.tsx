import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { usePlanner } from '../../store/PlannerContext';
import { getWeekDays, toISODate, formatDate, capitalizeFirst } from '../../utils/dateUtils';
import { getItem, KEYS } from '../../store/localStorage';
import type { DailyPlan, Task } from '../../types';

const PRIORITY_DOT: Record<string, string> = {
  alta: 'bg-red-400',
  media: 'bg-amber-400',
  baja: 'bg-green-400',
};

interface OverdueEntry {
  task: Task;
  sourceDate: string;
  dayLabel: string;
}

export function OverdueTasks() {
  const { state } = usePlanner();
  const [open, setOpen] = useState(true);
  const todayISO = toISODate(state.selectedDate);

  const overdue = useMemo<OverdueEntry[]>(() => {
    const weekDays = getWeekDays(state.selectedDate);
    const entries: OverdueEntry[] = [];
    for (const day of weekDays) {
      const iso = toISODate(day);
      if (iso >= todayISO) continue;
      const plan = getItem<DailyPlan>(KEYS.daily(iso));
      const pending = (plan?.tasks ?? []).filter(
        t => (t.status === 'pendiente' || t.status === 'en_progreso') && !t.unplanned
      );
      for (const task of pending) {
        entries.push({
          task,
          sourceDate: iso,
          dayLabel: capitalizeFirst(formatDate(new Date(iso + 'T12:00:00'), 'EEE d')),
        });
      }
    }
    return entries;
  }, [state.selectedDate, state.dailyPlan, todayISO]);

  if (overdue.length === 0) return null;

  return (
    <div className="border border-amber-300 rounded-xl overflow-hidden bg-amber-50/40">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-50 transition-colors"
      >
        {open ? <ChevronDown size={13} className="text-amber-600" /> : <ChevronRight size={13} className="text-amber-600" />}
        <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-800">Atrasadas ({overdue.length})</span>
        <span className="ml-auto text-[10px] text-amber-600 flex items-center gap-0.5">
          <GripVertical size={10} /> arrastra al horario
        </span>
      </button>

      {open && (
        <div className="px-2 pb-2 space-y-0.5">
          {overdue.map(({ task, sourceDate, dayLabel }) => (
            <div
              key={task.id}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData(
                  'application/x-overdue-task',
                  JSON.stringify({ taskId: task.id, sourceDate })
                );
                e.dataTransfer.effectAllowed = 'move';
              }}
              className={clsx(
                'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing',
                'bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors'
              )}
            >
              <GripVertical size={11} className="text-amber-500 flex-shrink-0" />
              <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority])} />
              <span className="flex-1 text-xs text-amber-900 leading-tight truncate">{task.title}</span>
              <span className="text-[10px] text-amber-600 font-medium flex-shrink-0">{dayLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
