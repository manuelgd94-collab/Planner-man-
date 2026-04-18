import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Goal } from '../../types';
import { GoalStatusBadge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Modal } from '../ui/Modal';
import { GoalForm } from '../monthly/GoalForm';

interface WeeklyGoalsProps {
  goals: Goal[];
  weekStart: string;
  readOnly: boolean;
  onChange: (goals: Goal[]) => void;
}

export function WeeklyGoals({ goals, weekStart, readOnly, onChange }: WeeklyGoalsProps) {
  const [showForm, setShowForm] = useState(false);
  const [year, month] = weekStart.split('-').map(Number);

  function handleAdd(data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    onChange([...goals, { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }]);
    setShowForm(false);
  }

  function handleUpdate(updated: Goal) {
    onChange(goals.map(g => g.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : g));
  }

  function handleDelete(id: string) {
    onChange(goals.filter(g => g.id !== id));
  }

  return (
    <div className="flex flex-col h-full">
      {goals.length === 0 ? (
        <p className="text-xs text-text-muted text-center pt-6 flex-1">
          {readOnly ? 'Sin objetivos' : 'Agrega tu primer objetivo'}
        </p>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {goals.map(goal => (
            <WeeklyGoalCard
              key={goal.id}
              goal={goal}
              readOnly={readOnly}
              year={year}
              month={month}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!readOnly && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 flex items-center justify-center gap-1 w-full text-xs text-text-muted border border-dashed border-border rounded-lg py-1.5 hover:bg-surface-tertiary transition-colors"
        >
          <Plus size={11} /> Agregar objetivo
        </button>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo objetivo semanal">
        <GoalForm
          scope="monthly"
          year={year}
          month={month}
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function WeeklyGoalCard({ goal, readOnly, year, month, onUpdate, onDelete }: {
  goal: Goal;
  readOnly: boolean;
  year: number;
  month: number;
  onUpdate: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="group bg-surface-secondary rounded-lg p-2.5 hover:bg-surface-tertiary transition-colors">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: goal.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="text-xs font-medium text-text-primary leading-snug">{goal.title}</p>
              {!readOnly && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => setEditing(true)} className="p-1 rounded text-text-muted hover:text-text-primary">
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => onDelete(goal.id)} className="p-1 rounded text-text-muted hover:text-red-500">
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <ProgressBar value={goal.progress} color={goal.color} className="flex-1" />
              <span className="text-[10px] text-text-muted flex-shrink-0">{goal.progress}%</span>
            </div>
            <div className="mt-1.5">
              <GoalStatusBadge status={goal.status} />
            </div>
          </div>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar objetivo semanal">
        <GoalForm
          initial={goal}
          scope="monthly"
          year={year}
          month={month}
          onSubmit={data => { onUpdate({ ...goal, ...data }); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}
