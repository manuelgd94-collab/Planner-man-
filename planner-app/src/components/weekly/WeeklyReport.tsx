import { useMemo } from 'react';
import { Download, ClipboardCopy, CheckCircle2, Circle, AlertTriangle, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '../ui/Modal';
import { usePlanner } from '../../store/PlannerContext';
import { getItem, KEYS } from '../../store/localStorage';
import { getWeekDays, toISODate, formatDate, capitalizeFirst } from '../../utils/dateUtils';
import type { DailyPlan, WeeklyPlan } from '../../types';

interface WeeklyReportProps {
  open: boolean;
  onClose: () => void;
}

export function WeeklyReport({ open, onClose }: WeeklyReportProps) {
  const { state } = usePlanner();
  const habits   = useMemo(() => state.habits.filter(h => !h.archivedAt), [state.habits]);
  const weekDays = useMemo(() => getWeekDays(state.selectedDate), [state.selectedDate]);
  const weekStart = toISODate(weekDays[0]);

  const weeklyPlan = getItem<WeeklyPlan>(KEYS.weekly(weekStart));

  const dailyData = useMemo(() => weekDays.map(day => {
    const iso  = toISODate(day);
    const plan = getItem<DailyPlan>(KEYS.daily(iso));
    const all  = plan?.tasks ?? [];
    const habitEntries = plan?.habitEntries ?? [];

    const planned    = all.filter(t => !t.unplanned);
    const unplanned  = all.filter(t => !!t.unplanned);
    const rescheduled = planned.filter(t => !!t.rescheduledFrom);

    const plannedDone     = planned.filter(t => t.status === 'completada');
    const plannedPending  = planned.filter(t => t.status === 'pendiente' || t.status === 'en_progreso');
    const plannedMoved    = planned.filter(t => t.status === 'reprogramada');
    const unplannedDone   = unplanned.filter(t => t.status === 'completada');
    const rescheduledDone = rescheduled.filter(t => t.status === 'completada');

    const habitsOk = habits.filter(h => habitEntries.find(e => e.habitId === h.id && e.completed));
    const pct = planned.length > 0 ? Math.round((plannedDone.length / planned.length) * 100) : null;

    return {
      day, iso,
      label: capitalizeFirst(formatDate(day, "EEEE d 'de' MMMM")),
      shortLabel: capitalizeFirst(formatDate(day, 'EEE d/M')),
      hasTasks: all.length > 0,
      planned, unplanned, rescheduled,
      plannedDone, plannedPending, plannedMoved,
      unplannedDone, rescheduledDone,
      habitsOk, pct,
    };
  }), [weekDays, habits]);

  const first = weekDays[0], last = weekDays[6];
  const weekLabel = first.getMonth() === last.getMonth()
    ? `${first.getDate()}–${last.getDate()} de ${capitalizeFirst(formatDate(first, 'MMMM yyyy'))}`
    : `${first.getDate()} ${capitalizeFirst(formatDate(first, 'MMM'))} – ${last.getDate()} ${capitalizeFirst(formatDate(last, 'MMM yyyy'))}`;

  const totalPlanned    = dailyData.reduce((s, d) => s + d.planned.length, 0);
  const totalDone       = dailyData.reduce((s, d) => s + d.plannedDone.length, 0);
  const totalUnplanned  = dailyData.reduce((s, d) => s + d.unplanned.length, 0);
  const totalRescheduled = dailyData.reduce((s, d) => s + d.rescheduled.length, 0);
  const overallPct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;

  /* ── Text report generator ── */
  function buildText(): string {
    const L  = '═'.repeat(52);
    const l  = '─'.repeat(52);
    const ts = new Date().toLocaleString('es', { dateStyle: 'full', timeStyle: 'short' });
    const lines: string[] = [];

    lines.push(L, 'REPORTE DE TURNO SEMANAL', `Semana: ${weekLabel}`, `Generado: ${ts}`, L, '');
    lines.push('RESUMEN GENERAL', l);
    lines.push(`Cumplimiento planificado : ${totalDone}/${totalPlanned} (${overallPct}%)`);
    if (totalUnplanned  > 0) lines.push(`Tareas no planificadas   : ${totalUnplanned}`);
    if (totalRescheduled > 0) lines.push(`Tareas reprogramadas     : ${totalRescheduled}`);
    lines.push('');

    if (weeklyPlan?.goals?.length) {
      lines.push('OBJETIVOS SEMANALES:');
      weeklyPlan.goals.forEach(g => {
        const icon = g.status === 'completada' ? '✓' : g.status === 'en_progreso' ? '→' : '○';
        lines.push(`  ${icon} ${g.title}  ${g.progress}%`);
      });
      lines.push('');
    }

    dailyData.forEach(d => {
      lines.push('', L, d.label.toUpperCase());
      lines.push(`Cumplimiento: ${d.plannedDone.length}/${d.planned.length}${d.pct !== null ? ` (${d.pct}%)` : ''}`, l);

      if (!d.hasTasks) { lines.push('Sin tareas registradas'); return; }

      if (d.plannedDone.length)    { lines.push('COMPLETADAS:');              d.plannedDone.forEach(t   => lines.push(`  ✓ ${t.title}`)); }
      if (d.plannedPending.length) { lines.push('PENDIENTES:');               d.plannedPending.forEach(t => lines.push(`  ○ ${t.title}`)); }
      if (d.plannedMoved.length)   { lines.push('MOVIDAS A OTRO DÍA:');       d.plannedMoved.forEach(t  => lines.push(`  → ${t.title}`)); }
      if (d.rescheduled.length)    {
        lines.push(`ATRASADAS ABSORBIDAS (${d.rescheduledDone.length}/${d.rescheduled.length} ✓):`);
        d.rescheduled.forEach(t => lines.push(`  ${t.status === 'completada' ? '✓' : '↩'} ${t.title}  [de ${t.rescheduledFrom}]`));
      }
      if (d.unplanned.length) {
        lines.push(`NO PLANIFICADAS (${d.unplannedDone.length}/${d.unplanned.length} ✓):`);
        d.unplanned.forEach(t => lines.push(`  ${t.status === 'completada' ? '✓' : '⚡'} ${t.title}`));
      }
      if (d.habitsOk.length) lines.push(`HÁBITOS: ${d.habitsOk.map(h => h.name).join(' · ')}`);
    });

    const r = weeklyPlan?.retrospectiva;
    if (r?.logros || r?.mejoras || r?.aprendizajes) {
      lines.push('', L, 'RETROSPECTIVA', l);
      if (r.logros)       { lines.push('¿Qué funcionó bien?', r.logros, ''); }
      if (r.mejoras)      { lines.push('¿Qué mejorar?',       r.mejoras, ''); }
      if (r.aprendizajes) { lines.push('¿Qué aprendí?',       r.aprendizajes, ''); }
    }

    const em = Array.isArray(weeklyPlan?.emergencias) ? weeklyPlan!.emergencias : [];
    if (em.length) {
      lines.push('', 'EMERGENCIAS SEMANALES:', l);
      em.forEach(e => lines.push(`  ${e.completed ? '✓' : '!'} ${e.title}`));
    }

    return lines.join('\n');
  }

  function download() {
    const text = buildText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `reporte-turno-${weekStart}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyText() {
    navigator.clipboard.writeText(buildText()).catch(() => {});
  }

  return (
    <Modal open={open} onClose={onClose} title={`Reporte de turno — ${weekLabel}`}>
      <div className="flex flex-col gap-4" style={{ width: 620 }}>

        {/* Weekly KPIs */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: `${overallPct}%`, label: 'cumplimiento', color: overallPct >= 80 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-500' },
            { value: totalDone,        label: 'completadas',   color: 'text-green-600' },
            { value: totalPlanned - totalDone, label: 'pendientes', color: 'text-amber-600' },
            { value: totalUnplanned,   label: 'no planificadas', color: 'text-purple-600' },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className={clsx('text-2xl font-bold', color)}>{value}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Day-by-day breakdown */}
        <div className="border border-border rounded-xl overflow-hidden" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {dailyData.map(d => (
            <div key={d.iso} className="border-b border-border last:border-b-0">
              {/* Day header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 sticky top-0">
                <span className="text-xs font-semibold text-text-primary">{d.label}</span>
                <div className="flex items-center gap-2">
                  {d.unplanned.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-purple-600 font-medium">
                      <Zap size={9} /> {d.unplanned.length}
                    </span>
                  )}
                  {d.rescheduled.length > 0 && (
                    <span className="text-[10px] text-orange-500 font-medium">↩{d.rescheduled.length}</span>
                  )}
                  <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    d.pct === null    ? 'text-text-muted bg-gray-100'
                    : d.pct >= 80     ? 'text-green-700 bg-green-100'
                    : d.pct >= 50     ? 'text-amber-700 bg-amber-100'
                    : 'text-red-700 bg-red-100')}>
                    {d.pct !== null ? `${d.pct}% · ${d.plannedDone.length}/${d.planned.length}` : '—'}
                  </span>
                </div>
              </div>

              {!d.hasTasks ? (
                <p className="px-4 py-2 text-xs text-text-muted italic">Sin tareas registradas</p>
              ) : (
                <div className="px-4 py-2.5 space-y-1">
                  {d.plannedDone.map(t => (
                    <div key={t.id} className="flex items-start gap-1.5">
                      <CheckCircle2 size={11} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-text-muted line-through leading-tight">{t.title}</span>
                    </div>
                  ))}
                  {d.plannedPending.map(t => (
                    <div key={t.id} className="flex items-start gap-1.5">
                      <Circle size={11} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-text-primary leading-tight">{t.title}</span>
                    </div>
                  ))}
                  {d.rescheduled.map(t => (
                    <div key={t.id} className="flex items-start gap-1.5">
                      <span className="text-[10px] mt-0.5 flex-shrink-0 text-orange-500">↩</span>
                      <span className={clsx('text-xs leading-tight', t.status === 'completada' ? 'line-through text-text-muted' : 'text-orange-700')}>{t.title}</span>
                      <span className="text-[9px] text-orange-300 ml-auto flex-shrink-0">{t.rescheduledFrom}</span>
                    </div>
                  ))}
                  {d.unplanned.map(t => (
                    <div key={t.id} className="flex items-start gap-1.5">
                      <Zap size={11} className="text-purple-400 mt-0.5 flex-shrink-0" />
                      <span className={clsx('text-xs leading-tight', t.status === 'completada' ? 'line-through text-text-muted' : 'text-purple-700')}>{t.title}</span>
                    </div>
                  ))}
                  {d.habitsOk.length > 0 && (
                    <p className="text-[10px] text-indigo-500 pt-0.5">
                      Hábitos: {d.habitsOk.map(h => h.name).join(' · ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Retrospectiva */}
        {weeklyPlan?.retrospectiva && (weeklyPlan.retrospectiva.logros || weeklyPlan.retrospectiva.mejoras || weeklyPlan.retrospectiva.aprendizajes) && (
          <div className="border border-teal-200 rounded-xl p-3 bg-teal-50/40">
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-2">Retrospectiva</p>
            <div className="grid grid-cols-3 gap-3">
              {(['logros', 'mejoras', 'aprendizajes'] as const).map(k => {
                const labels = { logros: '¿Qué funcionó?', mejoras: '¿Qué mejorar?', aprendizajes: '¿Qué aprendí?' };
                const val = weeklyPlan.retrospectiva?.[k];
                if (!val) return null;
                return (
                  <div key={k}>
                    <p className="text-[10px] font-semibold text-teal-600 mb-0.5">{labels[k]}</p>
                    <p className="text-[11px] text-text-secondary leading-snug">{val}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Emergencias semanales */}
        {Array.isArray(weeklyPlan?.emergencias) && weeklyPlan!.emergencias.length > 0 && (
          <div className="border border-red-200 rounded-xl p-3 bg-red-50/30">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <AlertTriangle size={10} /> Emergencias semanales
            </p>
            <div className="space-y-1">
              {weeklyPlan!.emergencias.map(e => (
                <div key={e.id} className="flex items-center gap-1.5">
                  {e.completed
                    ? <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />
                    : <AlertTriangle size={11} className="text-red-500 flex-shrink-0" />}
                  <span className={clsx('text-xs', e.completed && 'line-through text-text-muted')}>{e.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 border-t border-border pt-3">
          <button onClick={copyText} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surface-secondary transition-colors">
            <ClipboardCopy size={13} /> Copiar al portapapeles
          </button>
          <button onClick={download} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors ml-auto">
            <Download size={13} /> Descargar .txt
          </button>
        </div>

      </div>
    </Modal>
  );
}
