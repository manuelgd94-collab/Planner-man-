import { useMemo, useState, useEffect, useRef } from 'react';
import { Clock, AlertCircle, CheckCircle2, FileText, Star, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { usePlanner } from '../store/PlannerContext';
import { getWeekDays, toISODate, formatDate, capitalizeFirst, getShiftWeekNumber } from '../utils/dateUtils';
import { getItem, setItem, KEYS } from '../store/localStorage';
import type { DailyPlan, WeeklyPlan, Goal, WeeklyItem, WeeklyHito } from '../types';
import { WeekDayColumn } from '../components/weekly/WeekDayColumn';
import { WeeklyGoals } from '../components/weekly/WeeklyGoals';
import { WeeklyItemList, EmergenciaHeader } from '../components/weekly/WeeklyItemList';
import { WeeklyReport } from '../components/weekly/WeeklyReport';

function migrateItems(raw: unknown): WeeklyItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as WeeklyItem[];
  if (typeof raw === 'string') {
    return raw.split('\n').filter(l => l.trim()).map(title => ({
      id: crypto.randomUUID(),
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    }));
  }
  return [];
}

function loadWeeklyPlan(weekStart: string): WeeklyPlan {
  const saved = getItem<WeeklyPlan>(KEYS.weekly(weekStart));
  if (saved) {
    return {
      ...saved,
      goals: saved.goals ?? [],
      pendientes: migrateItems((saved as any).pendientes),
      emergencias: migrateItems((saved as any).emergencias),
      hitos: saved.hitos ?? [],
    };
  }
  const prevDate = new Date(weekStart + 'T12:00:00');
  prevDate.setDate(prevDate.getDate() - 7);
  const prevPlan = getItem<WeeklyPlan>(KEYS.weekly(toISODate(prevDate)));
  const carryOver: WeeklyItem[] = prevPlan
    ? migrateItems((prevPlan as any).pendientes)
        .filter(i => !i.completed)
        .map(i => ({ ...i, id: crypto.randomUUID(), carriedOver: true, createdAt: new Date().toISOString() }))
    : [];
  return { weekStart, goals: [], pendientes: carryOver, emergencias: [], hitos: [] };
}

export function WeeklyPage() {
  const { state, dispatch, isReadOnly } = usePlanner();
  const [showReport, setShowReport] = useState(false);
  const weekDays = useMemo(() => getWeekDays(state.selectedDate), [state.selectedDate]);
  const weekStart = toISODate(weekDays[0]);
  const weekNum = getShiftWeekNumber(weekDays[0]);

  const plans = useMemo(() => {
    return weekDays.map(day => getItem<DailyPlan>(KEYS.daily(toISODate(day))));
  }, [weekDays]);

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(() => loadWeeklyPlan(weekStart));
  const planRef = useRef<WeeklyPlan>(weeklyPlan);
  planRef.current = weeklyPlan;
  const [newHito, setNewHito] = useState('');

  useEffect(() => {
    const plan = loadWeeklyPlan(weekStart);
    planRef.current = plan;
    setWeeklyPlan(plan);
  }, [weekStart]);

  function persist(updater: (prev: WeeklyPlan) => WeeklyPlan) {
    const updated = updater(planRef.current);
    planRef.current = updated;
    setWeeklyPlan(updated);
    setItem(KEYS.weekly(weekStart), updated);
  }

  function updateGoals(goals: Goal[]) {
    persist(prev => ({ ...prev, goals }));
  }
  function updatePendientes(pendientes: WeeklyItem[]) {
    persist(prev => ({ ...prev, pendientes }));
  }
  function updateEmergencias(emergencias: WeeklyItem[]) {
    persist(prev => ({ ...prev, emergencias }));
  }

  // Auto-hitos: completed pendientes not yet in hitos list
  const autoHitos = useMemo(() => {
    const existingTitles = new Set((weeklyPlan.hitos ?? []).filter(h => h.auto).map(h => h.title));
    return weeklyPlan.pendientes
      .filter(p => p.completed && !existingTitles.has(p.title))
      .map(p => ({ id: `auto_${p.id}`, title: p.title, auto: true, createdAt: p.createdAt }));
  }, [weeklyPlan.pendientes, weeklyPlan.hitos]);

  const allHitos: WeeklyHito[] = [...autoHitos, ...(weeklyPlan.hitos ?? []).filter(h => !h.auto)];

  function addHito() {
    if (!newHito.trim()) return;
    persist(prev => ({
      ...prev,
      hitos: [...(prev.hitos ?? []), { id: crypto.randomUUID(), title: newHito.trim(), auto: false, createdAt: new Date().toISOString() }],
    }));
    setNewHito('');
  }

  function removeHito(id: string) {
    persist(prev => ({ ...prev, hitos: (prev.hitos ?? []).filter(h => h.id !== id) }));
  }

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    const todayISO = toISODate(new Date());
    type TaskEntry = { id: string; title: string; priority: string; completedLate: boolean };
    const groups: { date: string; label: string; tasks: TaskEntry[] }[] = [];
    for (const day of weekDays) {
      const iso = toISODate(day);
      if (iso >= todayISO) continue;
      const plan = getItem<DailyPlan>(KEYS.daily(iso));
      const all = plan?.tasks ?? [];
      const tasks: TaskEntry[] = [
        ...all.filter(t => t.status === 'pendiente' || t.status === 'en_progreso')
             .map(t => ({ id: t.id, title: t.title, priority: t.priority, completedLate: false })),
        ...all.filter(t => t.status === 'completada')
             .map(t => ({ id: t.id, title: t.title, priority: t.priority, completedLate: true })),
      ];
      if (tasks.length > 0) {
        groups.push({ date: iso, label: capitalizeFirst(formatDate(new Date(iso + 'T12:00:00'), 'EEEE d MMM')), tasks });
      }
    }
    return groups;
  }, [weekDays]);

  const weekLabel = useMemo(() => {
    const first = weekDays[0], last = weekDays[6];
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} – ${last.getDate()} de ${capitalizeFirst(formatDate(first, 'MMMM yyyy'))}`;
    }
    return `${first.getDate()} ${capitalizeFirst(formatDate(first, 'MMM'))} – ${last.getDate()} ${capitalizeFirst(formatDate(last, 'MMM yyyy'))}`;
  }, [weekDays]);

  const totalOverdue = overdueTasks.reduce((s, g) => s + g.tasks.length, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-3 md:p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">{weekLabel} · W{weekNum} · Haz clic en un día para editarlo</p>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            <FileText size={13} />
            Reporte de turno
          </button>
        </div>

        {/* Top boxes: Objetivos / Pendientes / Emergencias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border rounded-xl overflow-hidden border-green-400 flex flex-col">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-center bg-green-700 text-white flex-shrink-0">
              Objetivos semanales
            </div>
            <div className="flex-1 p-2 bg-white min-h-[130px]">
              <WeeklyGoals goals={weeklyPlan.goals} weekStart={weekStart} readOnly={isReadOnly} onChange={updateGoals} />
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden border-green-400 flex flex-col">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-center bg-green-700 text-white flex-shrink-0">
              Elementos pendientes
            </div>
            <div className="flex-1 p-2 bg-white min-h-[130px]">
              <WeeklyItemList items={weeklyPlan.pendientes} variant="pendientes" readOnly={isReadOnly} onChange={updatePendientes} />
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden border-red-400 flex flex-col">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-center bg-red-600 text-white flex-shrink-0">
              <EmergenciaHeader />
            </div>
            <div className="flex-1 p-2 bg-white min-h-[130px]">
              <WeeklyItemList items={weeklyPlan.emergencias} variant="emergencias" readOnly={isReadOnly} onChange={updateEmergencias} />
            </div>
          </div>
        </div>

        {/* 7-day grid */}
        <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
          <div className="grid grid-cols-7 gap-2 md:gap-3 min-w-[560px] md:min-w-0">
            {weekDays.map((day, i) => (
              <WeekDayColumn
                key={day.toISOString()}
                date={day}
                plan={plans[i]}
                onSelectDay={d => { dispatch({ type: 'SET_DATE', date: d }); dispatch({ type: 'SET_VIEW', view: 'diario' }); }}
              />
            ))}
          </div>
        </div>

        {/* ── Cierre de turno ──────────────────────────────────────────────── */}
        <div className="border border-indigo-300 rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-indigo-700 text-white text-xs font-bold uppercase tracking-wide text-center">
            Cierre de turno
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">

            {/* Hitos importantes */}
            <div className="p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Star size={11} className="text-amber-500" />
                <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Hitos importantes</label>
              </div>

              <div className="space-y-1 flex-1">
                {allHitos.length === 0 && (
                  <p className="text-[11px] text-text-muted italic">
                    {weeklyPlan.pendientes.some(p => p.completed)
                      ? 'Los pendientes completados aparecerán aquí'
                      : 'Agrega hitos relevantes del turno'}
                  </p>
                )}
                {allHitos.map(h => (
                  <div key={h.id} className="flex items-start gap-1.5 group">
                    <Star size={10} className={clsx('mt-0.5 flex-shrink-0', h.auto ? 'text-amber-400' : 'text-indigo-400')} />
                    <span className="text-xs text-text-primary leading-tight flex-1">{h.title}</span>
                    {h.auto && <span className="text-[9px] text-amber-400 flex-shrink-0 mt-0.5">auto</span>}
                    {!h.auto && !isReadOnly && (
                      <button onClick={() => removeHito(h.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-opacity flex-shrink-0">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!isReadOnly && (
                <div className="flex gap-1 mt-1">
                  <input
                    value={newHito}
                    onChange={e => setNewHito(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addHito()}
                    placeholder="Agregar hito..."
                    className="flex-1 text-xs border border-border rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                  />
                  <button onClick={addHito} disabled={!newHito.trim()} className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Desviaciones del programa */}
            <div className="p-3 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Desviaciones del programa</label>
              <textarea
                className="flex-1 text-xs text-text-primary resize-none focus:outline-none bg-transparent leading-relaxed min-h-[100px] placeholder:text-text-muted"
                value={weeklyPlan.desviaciones ?? ''}
                onChange={e => persist(prev => ({ ...prev, desviaciones: e.target.value }))}
                readOnly={isReadOnly}
                placeholder={isReadOnly ? '' : 'Actividades que no se ejecutaron según lo programado...'}
              />
            </div>

            {/* Oportunidad de mejora */}
            <div className="p-3 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Oportunidad de mejora</label>
              <textarea
                className="flex-1 text-xs text-text-primary resize-none focus:outline-none bg-transparent leading-relaxed min-h-[100px] placeholder:text-text-muted"
                value={weeklyPlan.oportunidades ?? ''}
                onChange={e => persist(prev => ({ ...prev, oportunidades: e.target.value }))}
                readOnly={isReadOnly}
                placeholder={isReadOnly ? '' : 'Procesos o acciones que se pueden mejorar...'}
              />
            </div>

          </div>
        </div>

        {/* Overdue tasks */}
        {totalOverdue > 0 && (() => {
          const totalPending  = overdueTasks.reduce((s, g) => s + g.tasks.filter(t => !t.completedLate).length, 0);
          const totalDoneLate = overdueTasks.reduce((s, g) => s + g.tasks.filter(t => t.completedLate).length, 0);
          return (
            <div className="border border-amber-300 rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-amber-200 bg-amber-50 flex items-center gap-3 flex-wrap">
                <Clock size={14} className="text-amber-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-amber-800">Tareas atrasadas esta semana</span>
                <div className="flex items-center gap-2 ml-auto">
                  {totalPending > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-amber-200 text-amber-800 rounded-full px-2 py-0.5 font-medium">
                      <AlertCircle size={10} /> {totalPending} sin completar
                    </span>
                  )}
                  {totalDoneLate > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                      <CheckCircle2 size={10} /> {totalDoneLate} completada{totalDoneLate !== 1 ? 's' : ''} tarde
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {overdueTasks.map(group => (
                  <div key={group.date}>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1.5">{group.label}</p>
                    <div className="space-y-1">
                      {group.tasks.map(t => (
                        <div key={t.id} className={clsx('flex items-start gap-1.5', t.completedLate && 'opacity-55')}>
                          {t.completedLate
                            ? <CheckCircle2 size={11} className="text-green-500 mt-0.5 flex-shrink-0" />
                            : <AlertCircle  size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />}
                          <span className={clsx('text-xs leading-tight', t.completedLate ? 'line-through text-text-muted' : 'text-text-primary')}>
                            {t.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <WeeklyReport open={showReport} onClose={() => setShowReport(false)} />
    </div>
  );
}
