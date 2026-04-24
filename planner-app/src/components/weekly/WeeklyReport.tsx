import { useMemo } from 'react';
import { Download, ClipboardCopy, CheckCircle2, Circle, AlertTriangle, Zap, FileText, StickyNote, Star } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '../ui/Modal';
import { usePlanner } from '../../store/PlannerContext';
import { getItem, KEYS } from '../../store/localStorage';
import { getWeekDays, toISODate, formatDate, capitalizeFirst, getShiftWeekNumber } from '../../utils/dateUtils';
import type { DailyPlan, WeeklyPlan, Note } from '../../types';

interface WeeklyReportProps {
  open: boolean;
  onClose: () => void;
}

function noteToText(note: Note | undefined): string {
  if (!note?.blocks?.length) return '';
  return note.blocks
    .sort((a, b) => a.order - b.order)
    .map(b => b.content.trim())
    .filter(Boolean)
    .join('\n');
}

export function WeeklyReport({ open, onClose }: WeeklyReportProps) {
  const { state } = usePlanner();
  const habits   = useMemo(() => state.habits.filter(h => !h.archivedAt), [state.habits]);
  const weekDays = useMemo(() => getWeekDays(state.selectedDate), [state.selectedDate]);
  const weekStart = toISODate(weekDays[0]);
  const weekNum   = getShiftWeekNumber(weekDays[0]);
  const weekYear  = weekDays[0].getFullYear();

  const weeklyPlan = getItem<WeeklyPlan>(KEYS.weekly(weekStart));

  const dailyData = useMemo(() => weekDays.map(day => {
    const iso  = toISODate(day);
    const plan = getItem<DailyPlan>(KEYS.daily(iso));
    const all  = plan?.tasks ?? [];
    const habitEntries = plan?.habitEntries ?? [];

    const planned     = all.filter(t => !t.unplanned);
    const unplanned   = all.filter(t => !!t.unplanned);
    const rescheduled = planned.filter(t => !!t.rescheduledFrom);

    const plannedDone    = planned.filter(t => t.status === 'completada');
    const plannedPending = planned.filter(t => t.status === 'pendiente' || t.status === 'en_progreso');
    const plannedMoved   = planned.filter(t => t.status === 'reprogramada');
    const unplannedDone  = unplanned.filter(t => t.status === 'completada');
    const rescheduledDone = rescheduled.filter(t => t.status === 'completada');

    const habitsOk = habits.filter(h => habitEntries.find(e => e.habitId === h.id && e.completed));
    const pct = planned.length > 0 ? Math.round((plannedDone.length / planned.length) * 100) : null;
    const noteText = noteToText(plan?.note);

    return {
      day, iso,
      label: capitalizeFirst(formatDate(day, "EEEE d 'de' MMMM")),
      hasTasks: all.length > 0,
      planned, unplanned, rescheduled,
      plannedDone, plannedPending, plannedMoved,
      unplannedDone, rescheduledDone,
      habitsOk, pct, noteText,
      mood: plan?.mood ?? null,
    };
  }), [weekDays, habits]);

  const first = weekDays[0], last = weekDays[6];
  const periodLabel = first.getMonth() === last.getMonth()
    ? `${first.getDate()}–${last.getDate()} de ${capitalizeFirst(formatDate(first, 'MMMM yyyy'))}`
    : `${first.getDate()} ${capitalizeFirst(formatDate(first, 'MMM'))} – ${last.getDate()} ${capitalizeFirst(formatDate(last, 'MMM yyyy'))}`;

  const totalPlanned    = dailyData.reduce((s, d) => s + d.planned.length, 0);
  const totalDone       = dailyData.reduce((s, d) => s + d.plannedDone.length, 0);
  const totalUnplanned  = dailyData.reduce((s, d) => s + d.unplanned.length, 0);
  const totalRescheduled = dailyData.reduce((s, d) => s + d.rescheduled.length, 0);
  const overallPct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;

  const pendientes  = Array.isArray(weeklyPlan?.pendientes)  ? weeklyPlan!.pendientes  : [];
  const emergencias = Array.isArray(weeklyPlan?.emergencias) ? weeklyPlan!.emergencias : [];
  const goals       = weeklyPlan?.goals ?? [];
  const hitos       = weeklyPlan?.hitos ?? [];
  const desviaciones = weeklyPlan?.desviaciones ?? '';
  const oportunidades = weeklyPlan?.oportunidades ?? '';

  // Auto-hitos from completed pendientes not already in hitos
  const autoHitoTitles = new Set(hitos.filter(h => h.auto).map(h => h.title));
  const autoHitos = pendientes
    .filter(p => p.completed && !autoHitoTitles.has(p.title))
    .map(p => ({ id: `auto_${p.id}`, title: p.title, auto: true, createdAt: p.createdAt }));
  const allHitos = [...autoHitos, ...hitos.filter(h => !h.auto)];

  /* ── Text report ─────────────────────────────────────────────────────── */
  function buildText(): string {
    const SEP  = '═'.repeat(58);
    const sep  = '─'.repeat(58);
    const ts   = new Date().toLocaleString('es', { dateStyle: 'full', timeStyle: 'short' });
    const lines: string[] = [];

    lines.push(
      SEP,
      `REPORTE DE TURNO — SEMANA W${weekNum} · ${weekYear}`,
      `Período  : ${periodLabel}`,
      `Generado : ${ts}`,
      SEP,
      '',
      'Estimado equipo,',
      '',
      `Junto con saludar, se entrega el resumen del turno correspondiente a la semana W${weekNum}.`,
      '',
    );

    // ── 1. Gestión semanal ──────────────────────────────────────────────
    lines.push(SEP, '1. GESTIÓN SEMANAL', SEP, '');
    lines.push(`Cumplimiento general: ${totalDone}/${totalPlanned} (${overallPct}%)`);
    if (totalUnplanned)   lines.push(`Tareas no planificadas: ${totalUnplanned}`);
    if (totalRescheduled) lines.push(`Tareas absorbidas de días anteriores: ${totalRescheduled}`);
    lines.push('');

    if (goals.length) {
      lines.push('Objetivos del turno:');
      goals.forEach(g => {
        const icon = g.status === 'completada' ? '✓' : g.status === 'en_progreso' ? '→' : '○';
        lines.push(`  ${icon} ${g.title}${g.progress > 0 ? `  [${g.progress}%]` : ''}`);
      });
      lines.push('');
    }

    if (pendientes.length) {
      lines.push('Pendientes al cierre del turno:');
      pendientes.forEach(p => {
        lines.push(`  ${p.completed ? '✓' : '○'} ${p.title}${p.carriedOver ? '  ← viene del turno anterior' : ''}`);
      });
      lines.push('');
    }

    // ── 2. Detalle día a día ────────────────────────────────────────────
    lines.push(SEP, '2. DETALLE DÍA A DÍA', SEP);

    dailyData.forEach(d => {
      lines.push('', sep);
      lines.push(`${d.label.toUpperCase()}  —  Cumplimiento: ${d.plannedDone.length}/${d.planned.length}${d.pct !== null ? ` (${d.pct}%)` : ''}`);
      lines.push(sep);

      if (!d.hasTasks && !d.noteText) {
        lines.push('Sin registro.');
        return;
      }

      if (d.plannedDone.length) {
        lines.push('COMPLETADAS:');
        d.plannedDone.forEach(t => lines.push(`  ✓ ${t.title}`));
      }
      if (d.plannedPending.length) {
        lines.push('PENDIENTES:');
        d.plannedPending.forEach(t => lines.push(`  ○ ${t.title}`));
      }
      if (d.plannedMoved.length) {
        lines.push('MOVIDAS A OTRO DÍA:');
        d.plannedMoved.forEach(t => lines.push(`  → ${t.title}`));
      }
      if (d.rescheduled.length) {
        lines.push(`ABSORBIDAS DE DÍAS ANTERIORES (${d.rescheduledDone.length}/${d.rescheduled.length} resueltas):`);
        d.rescheduled.forEach(t => lines.push(`  ${t.status === 'completada' ? '✓' : '↩'} ${t.title}  [orig. ${t.rescheduledFrom}]`));
      }
      if (d.unplanned.length) {
        lines.push(`NO PLANIFICADAS / IMPREVISTOS (${d.unplannedDone.length}/${d.unplanned.length}):`);
        d.unplanned.forEach(t => lines.push(`  ${t.status === 'completada' ? '✓' : '⚡'} ${t.title}`));
      }
      if (d.habitsOk.length) {
        lines.push(`Hábitos: ${d.habitsOk.map(h => h.name).join(' · ')}`);
      }
      if (d.noteText) {
        lines.push('', 'NOTAS DEL DÍA:');
        d.noteText.split('\n').forEach(line => lines.push(`  ${line}`));
      }
    });

    // ── 3. Cierre de turno ─────────────────────────────────────────────
    lines.push('', SEP, '3. CIERRE DE TURNO', SEP, '');

    if (allHitos.length) {
      lines.push('HITOS IMPORTANTES:');
      allHitos.forEach(h => lines.push(`  ★ ${h.title}${h.auto ? '  [pendiente completado]' : ''}`));
      lines.push('');
    }
    if (desviaciones.trim()) {
      lines.push('DESVIACIONES DEL PROGRAMA:');
      desviaciones.split('\n').forEach(l => lines.push(`  ${l}`));
      lines.push('');
    }
    if (oportunidades.trim()) {
      lines.push('OPORTUNIDADES DE MEJORA:');
      oportunidades.split('\n').forEach(l => lines.push(`  ${l}`));
      lines.push('');
    }

    // ── 4. Emergencias ─────────────────────────────────────────────────
    if (emergencias.length) {
      lines.push('', SEP, '4. EMERGENCIAS / IMPREVISTOS SEMANALES', SEP, '');
      emergencias.forEach(e => lines.push(`  ${e.completed ? '✓' : '!'} ${e.title}`));
    }

    lines.push('', SEP);
    return lines.join('\n');
  }

  function download() {
    const text = buildText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `reporte-turno-W${weekNum}-${weekYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyText() {
    navigator.clipboard.writeText(buildText()).catch(() => {});
  }

  const MOOD_LABEL: Record<number, string> = { 1:'😟', 2:'😕', 3:'😐', 4:'🙂', 5:'😄' };

  return (
    <Modal open={open} onClose={onClose} title={`Reporte de turno — Semana W${weekNum} · ${periodLabel}`}>
      <div className="flex flex-col gap-4" style={{ width: 660 }}>

        {/* KPIs */}
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

        {/* Objectives + Pendientes */}
        {(goals.length > 0 || pendientes.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {goals.length > 0 && (
              <div className="border border-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide mb-2">Objetivos del turno</p>
                <ul className="space-y-1">
                  {goals.map(g => (
                    <li key={g.id} className="flex items-start gap-1.5">
                      <span className={clsx('text-xs mt-0.5 flex-shrink-0 font-bold',
                        g.status === 'completada' ? 'text-green-500' :
                        g.status === 'en_progreso' ? 'text-blue-500' : 'text-text-muted'
                      )}>
                        {g.status === 'completada' ? '✓' : g.status === 'en_progreso' ? '→' : '○'}
                      </span>
                      <span className="text-xs text-text-primary leading-tight">{g.title}</span>
                      {g.progress > 0 && <span className="text-[10px] text-text-muted ml-auto flex-shrink-0">{g.progress}%</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pendientes.length > 0 && (
              <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/30">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Pendientes al cierre</p>
                <ul className="space-y-1">
                  {pendientes.map(p => (
                    <li key={p.id} className="flex items-start gap-1.5">
                      {p.completed
                        ? <CheckCircle2 size={11} className="text-green-500 mt-0.5 flex-shrink-0" />
                        : <Circle size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />}
                      <span className={clsx('text-xs leading-tight', p.completed ? 'line-through text-text-muted' : 'text-text-primary')}>{p.title}</span>
                      {p.carriedOver && <span className="text-[9px] text-amber-400 ml-auto flex-shrink-0">heredado</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Day-by-day */}
        <div className="border border-border rounded-xl overflow-hidden" style={{ maxHeight: 440, overflowY: 'auto' }}>
          {dailyData.map(d => (
            <div key={d.iso} className="border-b border-border last:border-b-0">
              {/* Day header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 sticky top-0 z-10">
                <span className="text-xs font-semibold text-text-primary">{d.label}</span>
                <div className="flex items-center gap-2">
                  {d.mood && <span className="text-sm">{MOOD_LABEL[d.mood]}</span>}
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

              {!d.hasTasks && !d.noteText ? (
                <p className="px-4 py-2 text-xs text-text-muted italic">Sin registro</p>
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
                  {d.plannedMoved.map(t => (
                    <div key={t.id} className="flex items-start gap-1.5">
                      <span className="text-[10px] mt-0.5 flex-shrink-0 text-text-muted">→</span>
                      <span className="text-xs text-text-muted leading-tight">{t.title}</span>
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

                  {/* Daily note */}
                  {d.noteText && (
                    <div className="mt-2 pt-2 border-t border-dashed border-border">
                      <p className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 mb-1">
                        <StickyNote size={10} /> Notas del día
                      </p>
                      <p className="text-[11px] text-text-secondary whitespace-pre-line leading-relaxed">{d.noteText}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Emergencias */}
        {emergencias.length > 0 && (
          <div className="border border-red-200 rounded-xl p-3 bg-red-50/30">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <AlertTriangle size={10} /> Emergencias / imprevistos semanales
            </p>
            <div className="space-y-1">
              {emergencias.map(e => (
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

        {/* Cierre de turno */}
        {(allHitos.length > 0 || desviaciones || oportunidades) && (
          <div className="border border-indigo-200 rounded-xl p-3 bg-indigo-50/30">
            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-1">
              <FileText size={10} /> Cierre de turno
            </p>
            <div className="grid grid-cols-3 gap-4">
              {allHitos.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-amber-600 mb-1.5 flex items-center gap-1"><Star size={9}/> Hitos importantes</p>
                  <ul className="space-y-1">
                    {allHitos.map(h => (
                      <li key={h.id} className="flex items-start gap-1">
                        <Star size={9} className={clsx('mt-0.5 flex-shrink-0', h.auto ? 'text-amber-400' : 'text-indigo-400')} />
                        <span className="text-[11px] text-text-secondary leading-snug">{h.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {desviaciones && (
                <div>
                  <p className="text-[10px] font-semibold text-red-600 mb-1.5">Desviaciones del programa</p>
                  <p className="text-[11px] text-text-secondary leading-snug whitespace-pre-line">{desviaciones}</p>
                </div>
              )}
              {oportunidades && (
                <div>
                  <p className="text-[10px] font-semibold text-green-700 mb-1.5">Oportunidad de mejora</p>
                  <p className="text-[11px] text-text-secondary leading-snug whitespace-pre-line">{oportunidades}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 border-t border-border pt-3">
          <button onClick={copyText} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surface-secondary transition-colors">
            <ClipboardCopy size={13} /> Copiar texto
          </button>
          <button onClick={download} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors ml-auto">
            <Download size={13} /> Descargar W{weekNum}-{weekYear}.txt
          </button>
        </div>

      </div>
    </Modal>
  );
}
