import { usePlanner } from '../../store/PlannerContext';
import type { GoalStatus } from '../../types';

const STATUS_COLORS: Record<GoalStatus, string> = {
  no_iniciada: '#9CA3AF',
  en_progreso: '#3B82F6',
  completada: '#22C55E',
  abandonada: '#EF4444',
};

export function AnnualSummary() {
  const { state } = usePlanner();
  const goals = state.annualPlan?.goals ?? [];

  if (goals.length === 0) return null;

  const byStatus = goals.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = (acc[g.status] ?? 0) + 1;
    return acc;
  }, {});

  const avgProgress = Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-text-muted">Total de objetivos</p>
          <p className="text-2xl font-bold text-text-primary">{goals.length}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Progreso promedio</p>
          <p className="text-2xl font-bold text-text-primary">{avgProgress}%</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {(Object.entries(byStatus) as [GoalStatus, number][]).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
              <span className="text-sm font-medium text-text-primary">{count}</span>
              <span className="text-xs text-text-muted capitalize">{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
