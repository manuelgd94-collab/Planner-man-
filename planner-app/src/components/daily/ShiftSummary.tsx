import { CheckCircle2, Circle, AlertTriangle, ClipboardCopy } from 'lucide-react';
import { usePlanner } from '../../store/PlannerContext';
import { Modal } from '../ui/Modal';
import { getItem, KEYS } from '../../store/localStorage';
import { getWeekDays, toISODate, formatDate, capitalizeFirst } from '../../utils/dateUtils';
import type { WeeklyPlan } from '../../types';

interface ShiftSummaryProps {
  open: boolean;
  onClose: () => void;
  date: string;
}

export function ShiftSummary({ open, onClose, date }: ShiftSummaryProps) {
  const { state } = usePlanner();
  const tasks = state.dailyPlan?.tasks ?? [];
  const habits = state.habits.filter(h => !h.archivedAt);

  const completed = tasks.filter(t => t.status === 'completada');
  const pending   = tasks.filter(t => t.status === 'pendiente' || t.status === 'en_progreso');
  const cancelled = tasks.filter(t => t.status === 'cancelada');

  const habitEntries = state.dailyPlan?.habitEntries ?? [];
  const habitsCompleted = habits.filter(h => habitEntries.find(e => e.habitId === h.id && e.completed));

  const weekStart = toISODate(getWeekDays(new Date(date + 'T12:00:00'))[0]);
  const weeklyPlan = getItem<WeeklyPlan>(KEYS.weekly(weekStart));
  const emergencias = Array.isArray(weeklyPlan?.emergencias) ? weeklyPlan.emergencias : [];
  const pendientesSemanales = Array.isArray(weeklyPlan?.pendientes) ? weeklyPlan.pendientes : [];

  const dateLabel = capitalizeFirst(formatDate(new Date(date + 'T12:00:00'), "EEEE d 'de' MMMM yyyy"));
  const pct = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  function copyToClipboard() {
    const lines: string[] = [
      `RESUMEN DE TURNO — ${dateLabel.toUpperCase()}`,
      `Cumplimiento: ${completed.length}/${tasks.length} tareas (${pct}%)`,
      '',
    ];
    if (completed.length > 0) {
      lines.push('COMPLETADAS:');
      completed.forEach(t => lines.push(`  ✓ ${t.title}`));
      lines.push('');
    }
    if (pending.length > 0) {
      lines.push('PENDIENTES:');
      pending.forEach(t => lines.push(`  ○ ${t.title}`));
      lines.push('');
    }
    if (emergencias.length > 0) {
      lines.push('EMERGENCIAS:');
      emergencias.forEach(e => lines.push(`  ${e.completed ? '✓' : '!'} ${e.title}`));
      lines.push('');
    }
    if (habitsCompleted.length > 0) {
      lines.push(`HÁBITOS: ${habitsCompleted.map(h => h.name).join(', ')}`);
    }
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  }

  return (
    <Modal open={open} onClose={onClose} title={`Resumen de turno — ${dateLabel}`}>
      <div className="space-y-4 min-w-[360px]">

        {/* KPI bar */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-text-primary">{completed.length}</p>
            <p className="text-[11px] text-text-muted">completadas</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-amber-500">{pending.length}</p>
            <p className="text-[11px] text-text-muted">pendientes</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-text-secondary">{cancelled.length}</p>
            <p className="text-[11px] text-text-muted">canceladas</p>
          </div>
          <div className="text-center flex-1 border-l border-border pl-4">
            <p className="text-2xl font-bold text-green-600">{pct}%</p>
            <p className="text-[11px] text-text-muted">cumplimiento</p>
          </div>
        </div>

        {/* Completion progress */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Tasks */}
        <div className="grid grid-cols-2 gap-3">
          {completed.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-1.5">Completadas</p>
              <div className="space-y-1">
                {completed.map(t => (
                  <div key={t.id} className="flex items-start gap-1.5">
                    <CheckCircle2 size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-text-primary leading-snug">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pending.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Pendientes</p>
              <div className="space-y-1">
                {pending.map(t => (
                  <div key={t.id} className="flex items-start gap-1.5">
                    <Circle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-text-primary leading-snug">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Emergencias */}
        {emergencias.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <AlertTriangle size={11} /> Emergencias de la semana
            </p>
            <div className="space-y-1">
              {emergencias.map(e => (
                <div key={e.id} className="flex items-start gap-1.5">
                  <span className={e.completed ? 'text-green-500' : 'text-red-500'}>
                    {e.completed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  </span>
                  <span className={`text-xs leading-snug ${e.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                    {e.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pendientes semanales */}
        {pendientesSemanales.some(p => !p.completed) && (
          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1.5">Pendientes semanales sin completar</p>
            <div className="space-y-1">
              {pendientesSemanales.filter(p => !p.completed).map(p => (
                <div key={p.id} className="flex items-start gap-1.5">
                  <Circle size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-text-primary leading-snug">{p.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Habits */}
        {habitsCompleted.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide mb-1.5">Hábitos completados</p>
            <p className="text-xs text-text-primary">{habitsCompleted.map(h => h.name).join(' · ')}</p>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            <ClipboardCopy size={13} />
            Copiar resumen al portapapeles
          </button>
        </div>
      </div>
    </Modal>
  );
}
