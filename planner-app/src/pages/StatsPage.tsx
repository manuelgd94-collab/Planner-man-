import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { clsx } from 'clsx';
import { usePlanner } from '../store/PlannerContext';
import { getItem, KEYS } from '../store/localStorage';
import { subDaysUtil, toISODate, formatDate, capitalizeFirst } from '../utils/dateUtils';
import type { DailyPlan } from '../types';

function getLast7Days(): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(subDaysUtil(new Date(), i));
  }
  return days;
}

function calcStreak(habitId: string): number {
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const dateStr = toISODate(subDaysUtil(new Date(), i));
    const plan = getItem<DailyPlan>(KEYS.daily(dateStr));
    const done = plan?.habitEntries.find(e => e.habitId === habitId)?.completed;
    if (done) streak++;
    else break;
  }
  return streak;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-text-primary mt-2 leading-none">{value}</p>
      <p className="text-xs text-text-secondary mt-1.5">{sub}</p>
    </div>
  );
}

export function StatsPage() {
  const { state } = usePlanner();
  const habits = useMemo(() => state.habits.filter(h => !h.archivedAt), [state.habits]);
  const last7 = useMemo(() => getLast7Days(), []);

  const weekPlans = useMemo(
    () => last7.map(d => ({ date: d, plan: getItem<DailyPlan>(KEYS.daily(toISODate(d))) })),
    [last7]
  );

  const weekStats = useMemo(
    () =>
      weekPlans.map(({ date, plan }) => ({
        date,
        total: plan?.tasks.length ?? 0,
        completed: plan?.tasks.filter(t => t.status === 'completada').length ?? 0,
      })),
    [weekPlans]
  );

  const maxBar = Math.max(...weekStats.map(s => s.total), 1);

  const habitStats = useMemo(
    () =>
      habits.map(habit => {
        const checks = weekPlans.map(
          ({ plan }) => plan?.habitEntries.find(e => e.habitId === habit.id)?.completed ?? false
        );
        const doneCount = checks.filter(Boolean).length;
        const pct = Math.round((doneCount / 7) * 100);
        const streak = calcStreak(habit.id);
        return { habit, doneCount, pct, streak };
      }),
    [habits, weekPlans]
  );

  const totalWeek = weekStats.reduce((s, d) => s + d.completed, 0);
  const avgHabitPct =
    habitStats.length > 0
      ? Math.round(habitStats.reduce((s, h) => s + h.pct, 0) / habitStats.length)
      : 0;
  const maxStreak = habitStats.length > 0 ? Math.max(...habitStats.map(h => h.streak)) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Tareas completadas" value={totalWeek} sub="esta semana" />
          <StatCard label="Hábitos cumplidos" value={`${avgHabitPct}%`} sub="promedio semanal" />
          <StatCard
            label="Racha más larga"
            value={maxStreak > 0 ? `${maxStreak} días` : '—'}
            sub="hábito actual"
          />
        </div>

        {/* Task bar chart */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-5">
            Tareas completadas — últimos 7 días
          </h3>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {weekStats.map(({ date, total, completed }) => (
              <div key={date.toISOString()} className="flex-1 flex flex-col items-center gap-1.5">
                {/* bar */}
                <div className="w-full flex items-end justify-center" style={{ height: 88 }}>
                  {total > 0 ? (
                    <div
                      className="w-full rounded-t-md bg-gray-100 relative overflow-hidden"
                      style={{ height: `${Math.max(4, (total / maxBar) * 88)}px` }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-md transition-all duration-500"
                        style={{ height: `${(completed / total) * 100}%` }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-1 rounded-full bg-gray-100" />
                  )}
                </div>
                {/* label */}
                <span className="text-[10px] text-text-muted">
                  {capitalizeFirst(formatDate(date, 'EEE'))}
                </span>
                <span className="text-[10px] font-semibold text-text-secondary">
                  {completed}/{total}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <LegendDot color="bg-gray-800" label="Completadas" />
            <LegendDot color="bg-gray-100 border border-gray-200" label="Total" />
          </div>
        </div>

        {/* Habits */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Hábitos — semana actual
          </h3>
          {habitStats.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">
              No hay hábitos configurados todavía.
            </p>
          ) : (
            <div className="space-y-4">
              {habitStats.map(({ habit, doneCount, pct, streak }) => (
                <div key={habit.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-text-primary">{habit.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted">{doneCount}/7 días</span>
                      {streak > 0 && (
                        <span className={clsx('flex items-center gap-1 text-xs font-medium', streak >= 7 ? 'text-orange-500' : 'text-text-secondary')}>
                          <Flame size={12} />
                          {streak}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-text-primary w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500', pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-gray-400')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Day-by-day breakdown */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Detalle por día
          </h3>
          <div className="space-y-2">
            {weekStats.map(({ date, total, completed }) => {
              const pct = total > 0 ? Math.round((completed / total) * 100) : null;
              return (
                <div key={date.toISOString()} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-20 flex-shrink-0">
                    {capitalizeFirst(formatDate(date, 'EEE d MMM'))}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    {pct !== null && (
                      <div
                        className="h-full bg-gray-700 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                  <span className="text-xs text-text-muted w-12 text-right flex-shrink-0">
                    {total === 0 ? 'sin tareas' : `${completed}/${total}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
      <span className={clsx('w-3 h-3 rounded-sm inline-block', color)} />
      {label}
    </span>
  );
}
