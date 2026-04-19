import { useMemo } from 'react';
import { Flame, AlertTriangle, ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { usePlanner } from '../store/PlannerContext';
import { getItem, KEYS } from '../store/localStorage';
import { subDaysUtil, toISODate, formatDate, capitalizeFirst, getWeekDays } from '../utils/dateUtils';
import type { DailyPlan, WeeklyPlan } from '../types';

/* ─── helpers ─────────────────────────────────────────── */

function getLast(n: number): Date[] {
  const days: Date[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(subDaysUtil(new Date(), i));
  return days;
}

function getLastWeekStarts(n: number): Date[] {
  const currentThursday = getWeekDays(new Date())[0];
  return Array.from({ length: n }, (_, i) => subDaysUtil(currentThursday, (n - 1 - i) * 7));
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
      <span className={clsx('w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0', color)} />
      {label}
    </span>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
      <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap text-center">
        {children}
      </div>
      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
    </div>
  );
}

/* ─── KPI card ─────────────────────────────────────────── */

function KpiCard({ label, value, sub, accent, trend }: {
  label: string; value: string | number; sub: string;
  accent: string; trend?: 'up' | 'down' | 'flat' | null;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-400' : 'text-text-muted';
  return (
    <div className={clsx('bg-white border border-border rounded-xl p-4 flex flex-col gap-1 border-l-4', accent)}>
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-text-primary leading-none">{value}</p>
        {trend && <TrendIcon size={14} className={clsx('mb-0.5', trendColor)} />}
      </div>
      <p className="text-[11px] text-text-secondary">{sub}</p>
    </div>
  );
}

/* ─── 30-day completion sparkline ──────────────────────── */

function DailyCompletionChart({ data }: { data: { date: Date; pct: number | null }[] }) {
  return (
    <>
      <div className="flex items-end gap-0.5" style={{ height: 72 }}>
        {data.map(({ date, pct }, i) => {
          const color = pct === null ? 'bg-gray-100' : pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
          return (
            <div key={i} className="flex-1 flex flex-col justify-end group relative" style={{ height: 72 }}>
              <div className={clsx('w-full rounded-t', color)} style={{ height: `${pct === null ? 4 : Math.max(5, pct)}%` }} />
              <Tooltip>{capitalizeFirst(formatDate(date, 'EEE d MMM'))}{pct !== null ? `: ${pct}%` : ': sin tareas'}</Tooltip>
            </div>
          );
        })}
      </div>
      <div className="flex mt-1">
        {data.map(({ date }, i) => (
          <div key={i} className="flex-1 flex justify-center">
            {i % 7 === 0 && <span className="text-[9px] text-text-muted">{formatDate(date, 'd/M')}</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <LegendDot color="bg-green-500" label="≥80%" />
        <LegendDot color="bg-amber-400" label="50–79%" />
        <LegendDot color="bg-red-400" label="<50%" />
      </div>
    </>
  );
}

/* ─── Planned vs rescheduled (14d) ─────────────────────── */

function PlannedVsRescheduledChart() {
  const data = useMemo(() => getLast(14).map(date => {
    const plan = getItem<DailyPlan>(KEYS.daily(toISODate(date)));
    const tasks = plan?.tasks ?? [];
    const planned     = tasks.filter(t => !t.rescheduledFrom);
    const rescheduled = tasks.filter(t => !!t.rescheduledFrom);
    return {
      date,
      plannedTotal:    planned.length,
      plannedDone:     planned.filter(t => t.status === 'completada').length,
      reschTotal:      rescheduled.length,
      reschDone:       rescheduled.filter(t => t.status === 'completada').length,
    };
  }), []);

  const maxBar = Math.max(...data.map(d => d.plannedTotal + d.reschTotal), 1);
  const daysWithResch = data.filter(d => d.reschTotal > 0);
  const avgReschDone = daysWithResch.length > 0
    ? (daysWithResch.reduce((s, d) => s + d.reschDone, 0) / daysWithResch.length).toFixed(1) : '0';

  return (
    <div className="bg-white border border-border rounded-xl p-4 flex flex-col h-full">
      <div className="mb-1">
        <h3 className="text-xs font-semibold text-text-primary">Planificadas vs Reprogramadas</h3>
        <p className="text-[10px] text-text-muted">14 días · reprog. completadas/día: {avgReschDone}</p>
      </div>
      <div className="flex items-end gap-0.5 flex-1" style={{ minHeight: 72 }}>
        {data.map(({ date, plannedTotal, plannedDone, reschTotal, reschDone }, i) => {
          const total = plannedTotal + reschTotal;
          const barH = total === 0 ? 4 : Math.max(6, (total / maxBar) * 100);
          const reschFrac = total > 0 ? reschTotal / total : 0;
          const plannedDonePct = plannedTotal > 0 ? plannedDone / plannedTotal : 0;
          const reschDonePct   = reschTotal   > 0 ? reschDone   / reschTotal   : 0;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end group relative" style={{ height: 80 }}>
              {total > 0 ? (
                <div className="w-full rounded-t bg-gray-100 relative overflow-hidden" style={{ height: `${barH}%` }}>
                  {reschTotal > 0 && (
                    <>
                      <div className="absolute bottom-0 left-0 right-0 bg-orange-200" style={{ height: `${Math.round(reschFrac * 100)}%` }} />
                      {reschDone > 0 && <div className="absolute bottom-0 left-0 right-0 bg-orange-400" style={{ height: `${Math.round(reschFrac * reschDonePct * 100)}%` }} />}
                    </>
                  )}
                  {plannedDone > 0 && (
                    <div className="absolute left-0 right-0 bg-green-500" style={{ bottom: `${Math.round(reschFrac * 100)}%`, height: `${Math.round((plannedTotal / total) * plannedDonePct * 100)}%` }} />
                  )}
                </div>
              ) : (
                <div className="w-full rounded-t bg-gray-100 opacity-30" style={{ height: 3 }} />
              )}
              <Tooltip>
                <div>{capitalizeFirst(formatDate(date, 'EEE d'))}</div>
                <div>Plan {plannedDone}/{plannedTotal} · Rep {reschDone}/{reschTotal}</div>
              </Tooltip>
            </div>
          );
        })}
      </div>
      <div className="flex mt-1">
        {data.map(({ date }, i) => (
          <div key={i} className="flex-1 flex justify-center">
            {i % 7 === 0 && <span className="text-[9px] text-text-muted">{formatDate(date, 'd/M')}</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <LegendDot color="bg-green-500" label="Plan ✓" />
        <LegendDot color="bg-orange-400" label="Reprog ✓" />
        <LegendDot color="bg-orange-200 border border-orange-300" label="Reprog ✗" />
      </div>
    </div>
  );
}

/* ─── 8-week trend ──────────────────────────────────────── */

function WeeklyTrendChart() {
  const data = useMemo(() => getLastWeekStarts(8).map(weekStart => {
    const days = getWeekDays(weekStart);
    let total = 0, completed = 0;
    for (const d of days) {
      const plan = getItem<DailyPlan>(KEYS.daily(toISODate(d)));
      total += plan?.tasks.length ?? 0;
      completed += plan?.tasks.filter(t => t.status === 'completada').length ?? 0;
    }
    const pct = total > 0 ? Math.round((completed / total) * 100) : null;
    return { weekStart, pct };
  }), []);

  return (
    <>
      <div className="flex items-end gap-1.5" style={{ height: 72 }}>
        {data.map(({ weekStart, pct }, i) => {
          const color = pct === null ? 'bg-gray-100' : pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
          return (
            <div key={i} className="flex-1 flex flex-col justify-end group relative" style={{ height: 72 }}>
              <div className={clsx('w-full rounded-t', color)} style={{ height: `${pct === null ? 4 : Math.max(6, pct)}%` }} />
              <Tooltip>Sem {formatDate(weekStart, 'd/M')}{pct !== null ? `: ${pct}%` : ': sin tareas'}</Tooltip>
            </div>
          );
        })}
      </div>
      <div className="flex mt-1">
        {data.map(({ weekStart }, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <span className="text-[9px] text-text-muted">{formatDate(weekStart, 'd/M')}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── Salud operacional (emergencias + carry-over) ─────── */

function OperationalHealthChart() {
  const data = useMemo(() => getLastWeekStarts(8).map(weekStart => {
    const plan = getItem<WeeklyPlan>(KEYS.weekly(toISODate(weekStart)));
    const emergencias = Array.isArray(plan?.emergencias) ? plan.emergencias.length : 0;
    const pendientes  = Array.isArray(plan?.pendientes) ? plan.pendientes : [];
    const carryOver   = pendientes.filter(p => p.carriedOver).length;
    return { weekStart, emergencias, carryOver, totalPend: pendientes.length };
  }), []);

  const maxEmerg = Math.max(...data.map(d => d.emergencias), 1);
  const maxCarry = Math.max(...data.map(d => d.totalPend), 1);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Emergencias */}
      <div>
        <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1 mb-2">
          <AlertTriangle size={10} /> Emergencias / semana
        </p>
        <div className="flex items-end gap-1" style={{ height: 60 }}>
          {data.map(({ weekStart, emergencias }, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end group relative" style={{ height: 60 }}>
              <div className="w-full rounded-t bg-red-400 transition-all"
                style={{ height: emergencias === 0 ? 2 : `${Math.max(8, (emergencias / maxEmerg) * 60)}%`, opacity: emergencias === 0 ? 0.2 : 1 }} />
              <Tooltip>Sem {formatDate(weekStart, 'd/M')}: {emergencias}</Tooltip>
            </div>
          ))}
        </div>
        <div className="flex mt-1">
          {data.map(({ weekStart }, i) => (
            <div key={i} className="flex-1 flex justify-center">
              {(i === 0 || i === 7) && <span className="text-[9px] text-text-muted">{formatDate(weekStart, 'd/M')}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Carry-over */}
      <div>
        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1 mb-2">
          <ArrowLeftRight size={10} /> Carry-over / semana
        </p>
        <div className="flex items-end gap-1" style={{ height: 60 }}>
          {data.map(({ weekStart, totalPend, carryOver }, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end group relative" style={{ height: 60 }}>
              <div className="w-full rounded-t bg-gray-100 relative overflow-hidden"
                style={{ height: totalPend === 0 ? 2 : `${Math.max(8, (totalPend / maxCarry) * 60)}%`, opacity: totalPend === 0 ? 0.3 : 1 }}>
                {totalPend > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-blue-400"
                    style={{ height: `${Math.round((carryOver / totalPend) * 100)}%` }} />
                )}
              </div>
              <Tooltip>Sem {formatDate(weekStart, 'd/M')}: {carryOver}/{totalPend}</Tooltip>
            </div>
          ))}
        </div>
        <div className="flex mt-1">
          {data.map(({ weekStart }, i) => (
            <div key={i} className="flex-1 flex justify-center">
              {(i === 0 || i === 7) && <span className="text-[9px] text-text-muted">{formatDate(weekStart, 'd/M')}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main dashboard ────────────────────────────────────── */

export function StatsPage() {
  const { state } = usePlanner();
  const habits = useMemo(() => state.habits.filter(h => !h.archivedAt), [state.habits]);

  const last7  = useMemo(() => getLast(7), []);
  const last30 = useMemo(() => getLast(30), []);

  const weekPlans = useMemo(
    () => last7.map(d => ({ date: d, plan: getItem<DailyPlan>(KEYS.daily(toISODate(d))) })),
    [last7]
  );

  const weekStats = useMemo(
    () => weekPlans.map(({ date, plan }) => ({
      date,
      total:     plan?.tasks.length ?? 0,
      completed: plan?.tasks.filter(t => t.status === 'completada').length ?? 0,
    })),
    [weekPlans]
  );

  const monthStats = useMemo(
    () => last30.map(d => {
      const plan = getItem<DailyPlan>(KEYS.daily(toISODate(d)));
      const total = plan?.tasks.length ?? 0;
      const completed = plan?.tasks.filter(t => t.status === 'completada').length ?? 0;
      return { date: d, total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : null };
    }),
    [last30]
  );

  const habitStats = useMemo(
    () => habits.map(habit => {
      const doneCount = weekPlans.filter(({ plan }) =>
        plan?.habitEntries.find(e => e.habitId === habit.id)?.completed
      ).length;
      return { habit, doneCount, pct: Math.round((doneCount / 7) * 100), streak: calcStreak(habit.id) };
    }),
    [habits, weekPlans]
  );

  // KPI derived values
  const todayPlan = getItem<DailyPlan>(KEYS.daily(toISODate(new Date())));
  const todayTasks = todayPlan?.tasks ?? [];
  const todayDone  = todayTasks.filter(t => t.status === 'completada').length;
  const todayPct   = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : null;

  const totalWeek  = weekStats.reduce((s, d) => s + d.completed, 0);
  const maxStreak  = habitStats.length > 0 ? Math.max(...habitStats.map(h => h.streak)) : 0;

  const daysWithTasks = monthStats.filter(d => d.pct !== null);
  const avgPct = daysWithTasks.length > 0
    ? Math.round(daysWithTasks.reduce((s, d) => s + (d.pct ?? 0), 0) / daysWithTasks.length) : 0;

  // Week-over-week trend for KPI arrow
  const thisWeekAvg = weekStats.filter(d => d.total > 0).length > 0
    ? Math.round(weekStats.filter(d => d.total > 0).reduce((s, d) => s + Math.round((d.completed / d.total) * 100), 0) / weekStats.filter(d => d.total > 0).length) : 0;
  const prevWeekDays = Array.from({ length: 7 }, (_, i) => subDaysUtil(new Date(), i + 7));
  const prevWeekAvg = (() => {
    const days = prevWeekDays.map(d => {
      const plan = getItem<DailyPlan>(KEYS.daily(toISODate(d)));
      return plan?.tasks.length ? Math.round((plan.tasks.filter(t => t.status === 'completada').length / plan.tasks.length) * 100) : null;
    }).filter((v): v is number => v !== null);
    return days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
  })();
  const weekTrend: 'up' | 'down' | 'flat' = thisWeekAvg > prevWeekAvg + 5 ? 'up' : thisWeekAvg < prevWeekAvg - 5 ? 'down' : 'flat';

  return (
    <div className="h-full overflow-y-auto bg-surface-secondary/30">
      <div className="max-w-[1300px] mx-auto p-5 space-y-4">

        {/* ── Row 1: KPIs ── */}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            label="Hoy"
            value={todayPct !== null ? `${todayPct}%` : '—'}
            sub={todayTasks.length > 0 ? `${todayDone}/${todayTasks.length} tareas` : 'Sin tareas registradas'}
            accent={todayPct === null ? 'border-l-gray-300' : todayPct >= 80 ? 'border-l-green-500' : todayPct >= 50 ? 'border-l-amber-400' : 'border-l-red-400'}
          />
          <KpiCard
            label="Esta semana"
            value={`${thisWeekAvg}%`}
            sub={`${totalWeek} tareas completadas`}
            accent={thisWeekAvg >= 80 ? 'border-l-green-500' : thisWeekAvg >= 50 ? 'border-l-amber-400' : 'border-l-red-400'}
            trend={weekTrend}
          />
          <KpiCard
            label="Promedio 30 días"
            value={`${avgPct}%`}
            sub="cumplimiento diario"
            accent={avgPct >= 80 ? 'border-l-green-500' : avgPct >= 50 ? 'border-l-amber-400' : 'border-l-red-400'}
          />
          <KpiCard
            label="Mejor racha hábito"
            value={maxStreak > 0 ? `${maxStreak} días` : '—'}
            sub={maxStreak >= 7 ? '🔥 racha activa' : 'racha actual'}
            accent={maxStreak >= 14 ? 'border-l-orange-500' : maxStreak >= 7 ? 'border-l-amber-400' : 'border-l-gray-300'}
          />
        </div>

        {/* ── Row 2: Cumplimiento 30d + Plan vs Reprog ── */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 bg-white border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-text-primary mb-0.5">Cumplimiento diario — últimos 30 días</h3>
            <p className="text-[10px] text-text-muted mb-3">% tareas completadas por día</p>
            <DailyCompletionChart data={monthStats} />
          </div>
          <div className="col-span-4">
            <PlannedVsRescheduledChart />
          </div>
        </div>

        {/* ── Row 3: Semana actual + Tendencia semanal ── */}
        <div className="grid grid-cols-12 gap-4">
          {/* 7-day detail */}
          <div className="col-span-5 bg-white border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-text-primary mb-3">Semana actual — detalle por día</h3>
            <div className="space-y-1.5">
              {weekStats.map(({ date, total, completed }) => {
                const pct = total > 0 ? Math.round((completed / total) * 100) : null;
                const barColor = pct === null ? '' : pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
                return (
                  <div key={date.toISOString()} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary w-20 flex-shrink-0">
                      {capitalizeFirst(formatDate(date, 'EEE d MMM'))}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      {pct !== null && <div className={clsx('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />}
                    </div>
                    <span className="text-[10px] text-text-muted w-16 text-right flex-shrink-0">
                      {total === 0 ? '—' : `${completed}/${total} · ${pct}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8-week trend */}
          <div className="col-span-7 bg-white border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-text-primary mb-0.5">Tendencia semanal — últimas 8 semanas</h3>
            <p className="text-[10px] text-text-muted mb-3">% cumplimiento agregado por semana</p>
            <WeeklyTrendChart />
            <div className="flex items-center gap-3 mt-2">
              <LegendDot color="bg-green-500" label="≥80%" />
              <LegendDot color="bg-amber-400" label="50–79%" />
              <LegendDot color="bg-red-400" label="<50%" />
            </div>
          </div>
        </div>

        {/* ── Row 4: Hábitos + Salud operacional ── */}
        <div className="grid grid-cols-12 gap-4">
          {/* Hábitos */}
          {habitStats.length > 0 && (
            <div className="col-span-5 bg-white border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-text-primary mb-3">Hábitos — semana actual</h3>
              <div className="space-y-2.5">
                {habitStats.map(({ habit, doneCount, pct, streak }) => (
                  <div key={habit.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-text-primary truncate max-w-[140px]">{habit.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-text-muted">{doneCount}/7</span>
                        {streak > 0 && (
                          <span className={clsx('flex items-center gap-0.5 text-[10px] font-medium', streak >= 7 ? 'text-orange-500' : 'text-text-secondary')}>
                            <Flame size={10} /> {streak}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-text-primary w-7 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all', pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-gray-400')}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Salud operacional */}
          <div className={clsx('bg-white border border-border rounded-xl p-4', habitStats.length > 0 ? 'col-span-7' : 'col-span-12')}>
            <h3 className="text-xs font-semibold text-text-primary mb-0.5">Salud operacional — últimas 8 semanas</h3>
            <p className="text-[10px] text-text-muted mb-3">Emergencias y pendientes arrastrados · indica ruido no planificado</p>
            <OperationalHealthChart />
            <div className="flex items-center gap-4 mt-2">
              <LegendDot color="bg-red-400" label="Emergencias" />
              <LegendDot color="bg-blue-400" label="Carry-over" />
              <LegendDot color="bg-gray-100 border border-gray-200" label="Nuevos pendientes" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
