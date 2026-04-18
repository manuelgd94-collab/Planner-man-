import { useState } from 'react';
import { Pencil, Trash2, Clock, MoveRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { Task } from '../../types';
import { Modal } from '../ui/Modal';
import { TaskForm } from './TaskForm';
import { usePlanner } from '../../store/PlannerContext';
import { toISODate } from '../../utils/dateUtils';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onUpdate: (task: Task) => void;
  onDelete: () => void;
}

const PRIORITY_DOT: Record<string, string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-400',
  baja: 'bg-green-500',
};

function GoalBadge({ goalId }: { goalId: string }) {
  const { state } = usePlanner();
  const goal =
    state.monthlyPlan?.goals.find(g => g.id === goalId) ??
    state.annualPlan?.goals.find(g => g.id === goalId);
  if (!goal) return null;
  return (
    <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium truncate max-w-full">
      {goal.title}
    </span>
  );
}

export function TaskItem({ task, onToggle, onUpdate, onDelete }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const { isReadOnly } = usePlanner();
  const isCompleted = task.status === 'completada';
  const isRescheduled = task.status === 'reprogramada';
  const todayISO = toISODate(new Date());
  const isLateCompletion = isCompleted && task.dueDate < todayISO;

  return (
    <>
      <div
        draggable={!isReadOnly}
        onDragStart={e => {
          e.dataTransfer.setData('text/plain', task.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={clsx(
          'group flex items-start gap-2 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-surface-secondary',
          !isReadOnly && 'cursor-grab active:cursor-grabbing',
          isRescheduled && 'opacity-50'
        )}
      >
        <button
          onClick={isReadOnly ? undefined : onToggle}
          disabled={isReadOnly}
          className={clsx(
            'flex-shrink-0 mt-0.5 rounded border-2 transition-all flex items-center justify-center',
            isCompleted ? 'bg-gray-900 border-gray-900' : 'border-border hover:border-gray-400',
            isReadOnly && 'cursor-default'
          )}
          style={{ width: 15, height: 15 }}
        >
          {isCompleted && (
            <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1', PRIORITY_DOT[task.priority])} />

        <div className="flex-1 min-w-0">
          <p className={clsx('text-xs font-medium leading-snug', isCompleted || isRescheduled ? 'line-through text-text-muted' : 'text-text-primary')}>
            {task.title}
            {isLateCompletion && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] px-1 py-0 rounded bg-amber-100 text-amber-700 font-semibold align-middle">
                <Clock size={8} /> atrasada
              </span>
            )}
            {isRescheduled && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] px-1 py-0 rounded bg-orange-100 text-orange-700 font-semibold align-middle">
                <MoveRight size={8} /> reprogramada
              </span>
            )}
          </p>
          {task.description && <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{task.description}</p>}
          {task.goalId && <GoalBadge goalId={task.goalId} />}
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => setEditing(true)} className="p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors">
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className="p-0.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar tarea">
        <TaskForm
          initial={task}
          dueDate={task.dueDate}
          onSubmit={data => { onUpdate({ ...task, ...data }); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}
