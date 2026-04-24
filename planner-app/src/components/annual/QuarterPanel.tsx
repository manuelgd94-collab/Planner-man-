import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { Quarter } from '../../types';
import { TRIMESTRES } from '../../utils/constants';
import { AnnualGoalCard } from './AnnualGoalCard';
import { GoalForm } from '../monthly/GoalForm';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { usePlanner } from '../../store/PlannerContext';
import { getItem, setItem, KEYS } from '../../store/localStorage';

interface QuarterPanelProps {
  quarter: Quarter;
  year: number;
}

export function QuarterPanel({ quarter, year }: QuarterPanelProps) {
  const { state, addGoal, isReadOnly } = usePlanner();
  const [showForm, setShowForm] = useState(false);
  const [review, setReview] = useState('');
  const reviewKey = KEYS.quarterReview(year, quarter);
  const trimestre = TRIMESTRES[quarter];

  useEffect(() => {
    setReview(getItem<string>(reviewKey) ?? '');
  }, [reviewKey]);

  // Save on unmount (navigation without blur) and when review changes
  useEffect(() => {
    return () => { setItem(reviewKey, review); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review, reviewKey]);

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
        {!isReadOnly && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} />
          </Button>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-lg">
          <p className="text-xs text-text-muted">Sin objetivos</p>
          {!isReadOnly && (
            <button onClick={() => setShowForm(true)} className="text-xs text-text-secondary hover:text-text-primary mt-1 underline">
              Agregar objetivo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map(goal => (
            <AnnualGoalCard key={goal.id} goal={goal} quarter={quarter} />
          ))}
        </div>
      )}

      {/* Quarterly review notes */}
      <div className="mt-3 pt-3 border-t border-border">
        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide block mb-1">
          Notas de revisión trimestral
        </label>
        <textarea
          value={review}
          onChange={e => setReview(e.target.value)}
          onBlur={() => setItem(reviewKey, review)}
          readOnly={isReadOnly}
          placeholder={isReadOnly ? '' : 'Logros, aprendizajes, ajustes para el próximo trimestre...'}
          className="w-full text-xs text-text-primary border border-border rounded-lg px-2 py-1.5 resize-none outline-none focus:border-gray-400 bg-white min-h-[60px] leading-relaxed placeholder:text-text-muted"
        />
      </div>

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
