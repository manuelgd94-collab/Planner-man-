import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Quarter } from '../../types';
import { TRIMESTRES } from '../../utils/constants';
import { AnnualGoalCard } from './AnnualGoalCard';
import { GoalForm } from '../monthly/GoalForm';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { usePlanner } from '../../store/PlannerContext';

interface QuarterPanelProps {
  quarter: Quarter;
  year: number;
}

export function QuarterPanel({ quarter, year }: QuarterPanelProps) {
  const { state, addGoal } = usePlanner();
  const [showForm, setShowForm] = useState(false);
  const trimestre = TRIMESTRES[quarter];

  const goals = (state.annualPlan?.goals ?? []).filter(g => g.quarter === quarter);
  const completed = goals.filter(g => g.status === 'completada').length;

  return (
    <div className="bg-surface-secondary rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{trimestre.label}</h3>
          {goals.length > 0 && (
            <p className="text-xs text-text-muted">{completed}/{goals.length} completados</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} />
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
          <p className="text-xs text-text-muted">Sin objetivos</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-text-secondary hover:text-text-primary mt-1 underline"
          >
            Agregar objetivo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map(goal => (
            <AnnualGoalCard key={goal.id} goal={goal} quarter={quarter} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={`Nuevo objetivo — ${trimestre.label}`}>
        <GoalForm
          scope="annual"
          quarter={quarter}
          year={year}
          onSubmit={data => { addGoal({ ...data, quarter }); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
