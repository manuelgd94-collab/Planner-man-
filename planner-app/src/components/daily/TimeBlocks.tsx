import { useState } from 'react';
import { clsx } from 'clsx';
import { Plus, GripVertical } from 'lucide-react';
import { usePlanner } from '../../store/PlannerContext';
import { Modal } from '../ui/Modal';
import { TaskForm } from './TaskForm';
import { toISODate } from '../../utils/dateUtils';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-100 border-red-300 text-red-800',
  media: 'bg-amber-50 border-amber-200 text-amber-800',
  baja: 'bg-green-50 border-green-200 text-green-800',
};

export function TimeBlocks() {
  const { state, addTask, updateTask, toggleTask, isReadOnly } = usePlanner();
  const [addingAt, setAddingAt] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const dateStr = toISODate(state.selectedDate);
  const tasks = state.dailyPlan?.tasks ?? [];
  const tasksWithTime = tasks.filter(t => t.startTime);
  const tasksWithoutTime = tasks.filter(t => !t.startTime && t.status !== 'completada');

  function getTasksForHour(hour: number) {
    const h = String(hour).padStart(2, '0');
    return tasksWithTime.filter(t => t.startTime?.startsWith(h));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, hour: number) {
    e.preventDefault();
    setDragOverHour(null);
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const hStr = String(hour).padStart(2, '0');
    updateTask({ ...task, startTime: `${hStr}:00`, updatedAt: new Date().toISOString() });
  }

  const now = new Date();
  const currentHour = now.getHours();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Bloques de tiempo</span>
        {tasksWithoutTime.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-text-muted italic">
            <GripVertical size={12} />
            Arrastra tareas al horario para programarlas
          </span>
        )}
      </div>

      <div className="relative space-y-0">
        {HOURS.map(hour => {
          const hourTasks = getTasksForHour(hour);
          const isCurrentHour = hour === currentHour;
          const isDragOver = dragOverHour === hour;
          const hStr = String(hour).padStart(2, '0');

          return (
            <div
              key={hour}
              onDragOver={e => { e.preventDefault(); setDragOverHour(hour); }}
              onDragLeave={() => setDragOverHour(null)}
              onDrop={e => handleDrop(e, hour)}
              className={clsx(
                'flex gap-2 min-h-[40px] group border-t border-border/50 transition-colors',
                isCurrentHour && 'bg-blue-50/40',
                isDragOver && 'bg-blue-100 ring-1 ring-inset ring-blue-400'
              )}
            >
              {/* Hour label */}
              <div className="w-12 flex-shrink-0 pt-1.5">
                <span className={clsx('text-xs font-medium', isCurrentHour ? 'text-blue-600' : isDragOver ? 'text-blue-700 font-bold' : 'text-text-muted')}>
                  {hStr}:00
                </span>
              </div>

              {/* Tasks in this slot */}
              <div className="flex-1 py-1 flex flex-wrap gap-1 items-start min-h-[32px]">
                {isDragOver && hourTasks.length === 0 && (
                  <span className="text-[11px] text-blue-500 italic py-0.5">Soltar aquí</span>
                )}
                {hourTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => !isReadOnly && toggleTask(task.id)}
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded border font-medium transition-opacity max-w-full truncate',
                      PRIORITY_COLORS[task.priority],
                      task.status === 'completada' && 'opacity-50 line-through'
                    )}
                    title={task.title}
                  >
                    {task.startTime} — {task.title}
                  </button>
                ))}

                {!isReadOnly && (
                  <button
                    onClick={() => setAddingAt(`${hStr}:00`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary p-0.5 rounded"
                    title={`Agregar tarea a las ${hStr}:00`}
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CurrentTimeIndicator />

      <Modal open={!!addingAt} onClose={() => setAddingAt(null)} title={`Nueva tarea — ${addingAt}`}>
        <TaskForm
          dueDate={dateStr}
          initial={{ startTime: addingAt ?? undefined }}
          onSubmit={data => { addTask(data); setAddingAt(null); }}
          onCancel={() => setAddingAt(null)}
        />
      </Modal>
    </div>
  );
}

function CurrentTimeIndicator() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  if (hours < 6 || hours > 22) return null;

  const topPx = (hours - 6) * 40 + (minutes / 60) * 40 + 8;

  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none"
      style={{ top: `${topPx}px` }}
    >
      <div className="w-2 h-2 rounded-full bg-blue-500 ml-10 flex-shrink-0" />
      <div className="flex-1 h-px bg-blue-400" />
    </div>
  );
}
