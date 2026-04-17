import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { Task } from '../../types';
import { Modal } from '../ui/Modal';
import { TaskForm } from './TaskForm';
import { usePlanner } from '../../store/PlannerContext';

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

  return (
    <>
      <div className={clsx('group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-surface-secondary')}>
        <button
          onClick={isReadOnly ? undefined : onToggle}
          disabled={isReadOnly}
          className={clsx(
            'flex-shrink-0 mt-0.5 rounded border-2 transition-all flex items-center justify-center',
            isCompleted ? 'bg-gray-900 border-gray-900' : 'border-border hover:border-gray-400',
            isReadOnly && 'cursor-default'
          )}
          style={{ width: 18, height: 18 }}
        >
          {isCompleted && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', PRIORITY_DOT[task.priority])} />

        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-medium leading-snug', isCompleted ? 'line-through text-text-muted' : 'text-text-primary')}>
            {task.title}
          </p>
          {task.description && <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{task.description}</p>}
          {task.goalId && <GoalBadge goalId={task.goalId} />}
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => setEditing(true)} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={onDelete} className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
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
