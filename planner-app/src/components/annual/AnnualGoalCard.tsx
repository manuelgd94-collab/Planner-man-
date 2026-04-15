import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Goal, Quarter } from '../../types';
import { GoalStatusBadge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Modal } from '../ui/Modal';
import { GoalForm } from '../monthly/GoalForm';
import { usePlanner } from '../../store/PlannerContext';

interface AnnualGoalCardProps {
  goal: Goal;
  quarter: Quarter;
}

export function AnnualGoalCard({ goal, quarter }: AnnualGoalCardProps) {
  const [editing, setEditing] = useState(false);
  const { updateGoal, deleteGoal } = usePlanner();

  return (
    <>
      <div className="group bg-white border border-border rounded-lg p-3 hover:border-gray-300 transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: goal.color }} />
            <p className="text-sm font-medium text-text-primary leading-snug truncate">{goal.title}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => setEditing(true)} className="p-1 rounded text-text-muted hover:text-text-primary">
              <Pencil size={12} />
            </button>
            <button onClick={() => deleteGoal(goal.id, 'annual')} className="p-1 rounded text-text-muted hover:text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {goal.description && (
          <p className="text-xs text-text-secondary mb-2 line-clamp-2">{goal.description}</p>
        )}

        <div className="flex items-center gap-2 mb-2">
          <ProgressBar value={goal.progress} color={goal.color} className="flex-1" />
          <span className="text-xs text-text-muted flex-shrink-0">{goal.progress}%</span>
        </div>

        <div className="flex items-center justify-between">
          <GoalStatusBadge status={goal.status} />
          {goal.category && (
            <span className="text-xs text-text-muted">{goal.category}</span>
          )}
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar objetivo">
        <GoalForm
          initial={goal}
          scope="annual"
          quarter={quarter}
          year={goal.year}
          onSubmit={data => { updateGoal({ ...goal, ...data }); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}
