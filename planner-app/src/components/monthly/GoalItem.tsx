import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Goal } from '../../types';
import { GoalStatusBadge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Modal } from '../ui/Modal';
import { GoalForm } from './GoalForm';
import { usePlanner } from '../../store/PlannerContext';

interface GoalItemProps {
  goal: Goal;
  scope: 'monthly' | 'annual';
}

export function GoalItem({ goal, scope }: GoalItemProps) {
  const [editing, setEditing] = useState(false);
  const { updateGoal, deleteGoal } = usePlanner();

  return (
    <>
      <div className="group bg-surface-secondary rounded-lg p-3 hover:bg-surface-tertiary transition-colors">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: goal.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-text-primary leading-snug">{goal.title}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => setEditing(true)} className="p-1 rounded text-text-muted hover:text-text-primary">
                  <Pencil size={12} />
                </button>
                <button onClick={() => deleteGoal(goal.id, scope)} className="p-1 rounded text-text-muted hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {goal.description && <p className="text-xs text-text-secondary mt-0.5">{goal.description}</p>}
            <div className="flex items-center gap-2 mt-2">
              <ProgressBar value={goal.progress} color={goal.color} className="flex-1" />
              <span className="text-xs text-text-muted flex-shrink-0">{goal.progress}%</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <GoalStatusBadge status={goal.status} />
              {goal.category && (
                <span className="text-xs text-text-muted">{goal.category}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar objetivo">
        <GoalForm
          initial={goal}
          scope={scope}
          onSubmit={data => { updateGoal({ ...goal, ...data }); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}
