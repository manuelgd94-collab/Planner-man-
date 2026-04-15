import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { usePlanner } from '../../store/PlannerContext';
import { GoalItem } from './GoalItem';
import { GoalForm } from './GoalForm';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { toYearMonth } from '../../utils/dateUtils';

export function MonthlyGoals() {
  const { state, addGoal } = usePlanner();
  const [showForm, setShowForm] = useState(false);
  const goals = state.monthlyPlan?.goals ?? [];
  const yearMonth = toYearMonth(state.selectedDate);
  const [year, m] = yearMonth.split('-').map(Number);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Objetivos del mes</span>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Agregar
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target size={28} strokeWidth={1} />}
          title="Sin objetivos este mes"
          description="Define qué quieres lograr este mes"
          action={<Button variant="primary" size="sm" onClick={() => setShowForm(true)}>Crear objetivo</Button>}
        />
      ) : (
        <div className="space-y-2">
          {goals.map(goal => (
            <GoalItem key={goal.id} goal={goal} scope="monthly" />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo objetivo mensual">
        <GoalForm
          scope="monthly"
          year={year}
          month={m}
          onSubmit={data => { addGoal(data); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
