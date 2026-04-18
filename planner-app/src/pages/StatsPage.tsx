import { useMemo } from 'react';
import { Flame, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { clsx } from 'clsx';
import { usePlanner } from '../store/PlannerContext';
import { getItem, KEYS } from '../store/localStorage';
import { subDaysUtil, toISODate, formatDate, capitalizeFirst, getWeekDays } from '../utils/dateUtils';
import type { DailyPlan, WeeklyPlan } from '../types';

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
      <span className={clsx('w-3 h-3 rounded-sm inline-block', color)} />
      {label}
    </span>
  );
}

function getLast(n: number): Date[] {
  const days: Date[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(subDaysUtil(new Date(), i));
  return days;
}

function calcStreak(habitId: string): number {
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const plan = getItem<DailyPlan>(KEYS.daily(toISODate(subDaysUtil(new Date(), i))));
    if (plan?.habitEntries.find(e => e.habitId === habitId)?.completed) streak++;
    else break;
  }
  return streak;
}

function WeeklyCompletionChart() {
  const weekStats = useMemo(() => {
    const today = new Date();
    const currentWeekDays = getWeekDays(today);
    const currentThursday = currentWeekDays[0];
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = subDaysUtil(currentThursday, (7 - i) * 7);
      const days = getWeekDays(weekStart);
      let total = 0;
      let completed = 0;
      for (const d of days) {
        const plan = getItem<DailyPlan>(KEYS.daily(toISODate(d)));
        total += plan?.tasks.length ?? 0;
        completed += plan?.tasks.filter(t => t.status === 'completada').length ?? 0;
      }
      const pct = total > 0 ? Math.round((completed / total) * 100) : null;
      return { weekStart, total, completed, pct };
    });
  }, []);

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        % Cumplimiento semanal — últimas 8 semanas
      </h3>
      <p className="text-xs text-text-muted mb-4">Tareas completadas vs total · verde ≥80%, naranja 50–79%, rojo &lt;50%</p>
      <div className="flex items-end gap-1.5" style={{ height: 100 }}>
        {weekStats.map(({ weekStart, pct }, i) => {
          const barColor = pct === null ? 'bg-gray-100'
            : pct >= 80 ? 'bg-green-500'
            : pct >= 50 ? 'bg-amber-400'
            : 'bg-red-400';
          const heightPct = pct === null ? 4 : Math.max(6, pct);
          const label = formatDate(weekStart, 'd/M');
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: 100 }}>
              <div
                className={clsx('w-full rounded-t transition-all duration-300', barColor)}
                style={{ height: `${heightPct}%` }}
              />
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">
                  Sem {label}{pct !== null ? `: ${pct}%` : ': sin tareas'}
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex mt-1.5">
        {weekStats.map(({ weekStart }, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <span className="text-[9px] text-text-muted">{formatDate(weekStart, 'd/M')}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <LegendDot color="bg-green-500" label="≥ 80%" />
        <LegendDot color="bg-amber-400" label="50–79%" />
        <LegendDot color="bg-red-400" label="< 50%" />
        <LegendDot color="bg-gray-100 border border-gray-200" label="Sin tareas" />
      </div>
    </div>
  );
}

function getLastWeekStarts(n: number): Date[] {
  const today = new Date();
  const currentWeekDays = getWeekDays(today);
  const currentThursday = currentWeekDays[0];
  return Array.from({ length: n }, (_, i) => subDaysUtil(currentThursday, (n - 1 - i) * 7));
}

function EmergencyFrequencyChart() {
  const weekStats = useMemo(() => {
    return getLastWeekStarts(8).map(weekStart => {
      const plan = getItem<WeeklyPlan>(KEYS.weekly(toISODate(weekStart)));
      const count = Array.isArray(plan?.emergencias) ? plan.emergencias.length : 0;
      return { weekStart, count };
    });
  }, []);

  const maxBar = Math.max(...weekStats.map(s => s.count), 1);

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
        <AlertTriangle size={14} className="text-red-500" />
        Frecuencia de emergencias — últimas 8 semanas
      </h3>
      <p className="text-xs text-text-muted mb-4">Cantidad de emergencias registradas por semana</p>
      <div className="flex items-end gap-1.5" style={{ height: 80 }}>
        {weekStats.map(({ weekStart, count }, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: 80 }}>
            <div
              className="w-full rounded-t bg-red-400 transition-all duration-300"
              style={{ height: count === 0 ? 3 : `${Math.max(8, (count / maxBar) * 80)}%`, opacity: count === 0 ? 0.2 : 1 }}
            />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
              <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">
                Sem {formatDate(weekStart, 'd/M')}: {count} emergencia{count !== 1 ? 's' : ''}
              </div>
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex mt-1.5">
        {weekStats.map(({ weekStart }, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <span className="text-[9px] text-text-muted">{formatDate(weekStart, 'd/M')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarryOverChart() {
  const weekStats = useMemo(() => {
    return getLastWeekStarts(8).map(weekStart => {
      const plan = getItem<WeeklyPlan>(KEYS.weekly(toISODate(weekStart)));
      const pendientes = Array.isArray(plan?.pendientes) ? plan.pendientes : [];
      const total = pendientes.length;
      const carriedOver = pendientes.filter(p => p.carriedOver).length;
      const uncompleted = pendientes.filter(p => !p.completed).length;
      return { weekStart, total, carriedOver, uncompleted };
    });
  }, []);

  const maxBar = Math.max(...weekStats.map(s => s.total), 1);
  const avgCarryOver = weekStats.filter(w => w.total > 0).length > 0
    ? (weekStats.reduce((s, w) => s + w.carriedOver, 0) / weekStats.filter(w => w.total > 0).length).toFixed(1)
    : '0';

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
        <ArrowLeftRight size={14} className="text-blue-500" />
        Tasa de carry-over — últimas 8 semanas
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Pendientes arrastrados de semana anterior · promedio: {avgCarryOver} por semana
      </p>
      <div className="flex items-end gap-1.5" style={{ height: 80 }}>
        {weekStats.map(({ weekStart, total, carriedOver }, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: 80 }}>
            <div
              className="w-full rounded-t bg-gray-100 relative overflow-hidden"
              style={{ height: total === 0 ? 3 : `${Math.max(8, (total / maxBar) * 80)}%`, opacity: total === 0 ? 0.3 : 1 }}
            >
              {total > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-blue-400"
                  style={{ height: `${Math.round((carriedOver / total) * 100)}%` }}
                />
              )}
            </div>
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
              <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">
                Sem {formatDate(weekStart, 'd/M')}: {carriedOver}/{total} arrastrados
              </div>
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex mt-1.5">
        {weekStats.map(({ weekStart }, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <span className="text-[9px] text-text-muted">{formatDate(weekStart, 'd/M')}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <LegendDot color="bg-blue-400" label="Arrastrados" />
        <LegendDot color="bg-gray-100 border border-gray-200" label="Nuevos" />
      </div>
    </div>
  );
}

function PlannedVsRescheduledChart() {
  const dayStats = useMemo(() => {
    return getLast(14).map(date => {
      const iso = toISODate(date);
      const plan = getItem<DailyPlan>(KEYS.daily(iso));
      const tasks = plan?.tasks ?? [];
      const planned    = tasks.filter(t => !t.rescheduledFrom);
      const rescheduled = tasks.filter(t => !!t.rescheduledFrom);
      const plannedDone    = planned.filter(t => t.status === 'completada').length;
      const plannedTotal   = planned.length;
      const rescheduledCount = rescheduled.length;
      return { date, iso, plannedTotal, plannedDone, rescheduledCount };
    });
  }, []);

  const maxBar = Math.max(...dayStats.map(s => s.plannedTotal + s.rescheduledCount), 1);
  const daysWithData = dayStats.filter(d => d.plannedTotal > 0 || d.rescheduledCount > 0);
  const avgRescheduled = daysWithData.length > 0
    ? (daysWithData.reduce((s, d) => s + d.rescheduledCount, 0) / daysWithData.length).toFixed(1)
    : '0';

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        Planificadas vs Reprogramadas — últimos 14 días
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Respaldo del cumplimiento diario · promedio reprogramadas/día: {avgRescheduled}
      </p>
      <div className="flex items-end gap-1" style={{ height: 100 }}>
        {dayStats.map(({ date, plannedTotal, plannedDone, rescheduledCount }, i) => {
          const total = plannedTotal + rescheduledCount;
          const barH = total === 0 ? 3 : Math.max(8, (total / maxBar) * 100);
          const plannedFrac = total > 0 ? plannedTotal / total : 0;
          const doneFrac = plannedTotal > 0 ? plannedDone / plannedTotal : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: 100 }}>
              {total > 0 ? (
                <div
                  className="w-full rounded-t bg-gray-100 relative overflow-hidden"
                  style={{ height: `${barH}%`, opacity: total === 0 ? 0.3 : 1 }}
                >
                  {/* Orange segment = rescheduled (bottom) */}
                  {rescheduledCount > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-orange-300"
                      style={{ height: `${Math.round((1 - plannedFrac) * 100)}%` }}
                    />
                  )}
                  {/* Green segment = planned done (above rescheduled) */}
                  {plannedDone > 0 && (
                    <div
                      className="absolute left-0 right-0 bg-green-500"
                      style={{
                        bottom: `${Math.round((1 - plannedFrac) * 100)}%`,
                        height: `${Math.round(plannedFrac * doneFrac * 100)}%`,
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="w-full rounded-t bg-gray-100" style={{ height: 3, opacity: 0.3 }} />
              )}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap text-center">
                  <div>{capitalizeFirst(formatDate(date, 'EEE d MMM'))}</div>
                  <div>Plan: {plannedDone}/{plannedTotal} ✓ · Reprog: {rescheduledCount}</div>
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex mt-1.5">
        {dayStats.map(({ date }, i) => (
          <div key={i} className="flex-1 flex justify-center">
            {i % 7 === 0 && <span className="text-[9px] text-text-muted">{formatDate(date, 'd/M')}</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <LegendDot color="bg-green-500" label="Planificadas completadas" />
        <LegendDot color="bg-gray-100 border border-gray-200" label="Planificadas pendientes" />
        <LegendDot color="bg-orange-300" label="Reprogramadas del día" />
      </div>
    </div>
  );
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
  const last7 = useMemo(() => getLast(7), []);
  const last30 = useMemo(() => getLast(30), []);

  const weekPlans = useMemo(
    () => last7.map(d => ({ date: d, plan: getItem<DailyPlan>(KEYS.daily(toISODate(d))) })),
    [last7]
  );

  const weekStats = useMemo(
    () => weekPlans.map(({ date, plan }) => ({
      date,
      total: plan?.tasks.length ?? 0,
      completed: plan?.tasks.filter(t => t.status === 'completada').length ?? 0,
    })),
    [weekPlans]
  );

  // 30-day daily completion % for the main chart
  const monthStats = useMemo(
    () => last30.map(d => {
      const plan = getItem<DailyPlan>(KEYS.daily(toISODate(d)));
      const total = plan?.tasks.length ?? 0;
      const completed = plan?.tasks.filter(t => t.status === 'completada').length ?? 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : null;
      return { date: d, total, completed, pct };
    }),
    [last30]
  );

  const maxBar = Math.max(...weekStats.map(s => s.total), 1);

  const habitStats = useMemo(
    () => habits.map(habit => {
      const checks = weekPlans.map(({ plan }) =>
        plan?.habitEntries.find(e => e.habitId === habit.id)?.completed ?? false
      );
      const doneCount = checks.filter(Boolean).length;
      const pct = Math.round((doneCount / 7) * 100);
      return { habit, doneCount, pct, streak: calcStreak(habit.id) };
    }),
    [habits, weekPlans]
  );

  const totalWeek = weekStats.reduce((s, d) => s + d.completed, 0);
  const maxStreak = habitStats.length > 0 ? Math.max(...habitStats.map(h => h.streak)) : 0;

  const daysWithTasks = monthStats.filter(d => d.pct !== null);
  const avgCompletionPct = daysWithTasks.length > 0
    ? Math.round(daysWithTasks.reduce((s, d) => s + (d.pct ?? 0), 0) / daysWithTasks.length) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Tareas completadas" value={totalWeek} sub="esta semana" />
          <StatCard label="Cumplimiento promedio" value={`${avgCompletionPct}%`} sub="últimos 30 días" />
          <StatCard
            label="Racha más larga"
            value={maxStreak > 0 ? `${maxStreak} días` : '—'}
            sub="hábito actual"
          />
        </div>

        {/* % Completion chart — 30 days */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            % Cumplimiento diario — últimos 30 días
          </h3>
          <p className="text-xs text-text-muted mb-4">Tareas completadas vs total · verde ≥80%, naranja 50–79%, rojo &lt;50%</p>
          <div className="flex items-end gap-0.5" style={{ height: 100 }}>
            {monthStats.map(({ date, pct }, i) => {
              const barColor = pct === null ? 'bg-gray-100'
                : pct >= 80 ? 'bg-green-500'
                : pct >= 50 ? 'bg-amber-400'
                : 'bg-red-400';
              const heightPct = pct === null ? 4 : Math.max(6, pct);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: 100 }}>
                  <div
                    className={clsx('w-full rounded-t transition-all duration-300', barColor)}
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                    <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">
                      {capitalizeFirst(formatDate(date, 'EEE d MMM'))}{pct !== null ? `: ${pct}%` : ': sin tareas'}
                    </div>
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              );
            })}
          </div>
          {/* X-axis labels every 7 days */}
          <div className="flex mt-1.5">
            {monthStats.map(({ date }, i) => (
              <div key={i} className="flex-1 flex justify-center">
                {i % 7 === 0 && (
                  <span className="text-[9px] text-text-muted">{formatDate(date, 'd/M')}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <LegendDot color="bg-green-500" label="≥ 80%" />
            <LegendDot color="bg-amber-400" label="50–79%" />
            <LegendDot color="bg-red-400" label="< 50%" />
            <LegendDot color="bg-gray-100 border border-gray-200" label="Sin tareas" />
          </div>
        </div>

        {/* Task count bar chart — 7 days */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-5">
            Tareas completadas — últimos 7 días
          </h3>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {weekStats.map(({ date, total, completed }) => (
              <div key={date.toISOString()} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end justify-center relative" style={{ height: 88 }}>
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
        {habitStats.length > 0 && (
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Hábitos — semana actual</h3>
            <div className="space-y-4">
              {habitStats.map(({ habit, doneCount, pct, streak }) => (
                <div key={habit.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-text-primary">{habit.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted">{doneCount}/7 días</span>
                      {streak > 0 && (
                        <span className={clsx('flex items-center gap-1 text-xs font-medium', streak >= 7 ? 'text-orange-500' : 'text-text-secondary')}>
                          <Flame size={12} /> {streak}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-text-primary w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500',
                        pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-gray-400')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Planned vs rescheduled daily breakdown */}
        <PlannedVsRescheduledChart />

        {/* Weekly completion % chart — last 8 weeks */}
        <WeeklyCompletionChart />
        <EmergencyFrequencyChart />
        <CarryOverChart />

        {/* Day-by-day detail */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Detalle por día — semana</h3>
          <div className="space-y-2">
            {weekStats.map(({ date, total, completed }) => {
              const pct = total > 0 ? Math.round((completed / total) * 100) : null;
              const barColor = pct === null ? '' : pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
              return (
                <div key={date.toISOString()} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-24 flex-shrink-0">
                    {capitalizeFirst(formatDate(date, 'EEE d MMM'))}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    {pct !== null && (
                      <div className={clsx('h-full rounded-full transition-all duration-500', barColor)}
                        style={{ width: `${pct}%` }} />
                    )}
                  </div>
                  <span className="text-xs text-text-muted w-24 text-right flex-shrink-0">
                    {total === 0 ? 'sin tareas' : `${completed}/${total} · ${pct}%`}
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
