import { useMemo, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, Clock, Zap, SmilePlus } from 'lucide-react';
import { CalendarGrid } from '../components/monthly/CalendarGrid';
import { MonthlyGoals } from '../components/monthly/MonthlyGoals';
import { MilestoneList } from '../components/monthly/MilestoneList';
import { usePlanner } from '../store/PlannerContext';
import { formatDate, capitalizeFirst, toYearMonth, toISODate } from '../utils/dateUtils';
import { getItem, KEYS } from '../store/localStorage';
import type { DailyPlan } from '../types';

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
const MOOD_LABEL: Record<number, string> = { 1: 'Mal', 2: 'Regular', 3: 'Normal', 4: 'Bien', 5: 'Excelente' };

function useMonthStats(selectedDate: Date) {
  return useMemo(() => {
    const year  = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayISO = toISODate(new Date());

    let totalPlanned = 0, totalDone = 0, totalUnplanned = 0, daysActive = 0;
    let moodSum = 0, moodCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toISODate(new Date(year, month, d));
      if (iso > todayISO) break;
      const plan = getItem<DailyPlan>(KEYS.daily(iso));
      if (!plan) continue;
      const planned = plan.tasks.filter(t => !t.unplanned);
      const done    = planned.filter(t => t.status === 'completada');
      const unp     = plan.tasks.filter(t => t.unplanned && t.status === 'completada');
      if (plan.tasks.length > 0 || plan.mood) daysActive++;
      totalPlanned   += planned.length;
      totalDone      += done.length;
      totalUnplanned += unp.length;
      if (plan.mood) { moodSum += plan.mood; moodCount++; }
    }

    const pct     = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : null;
    const avgMood = moodCount > 0 ? Math.round(moodSum / moodCount) : null;
    return { pct, totalDone, totalPlanned, totalUnplanned, daysActive, avgMood };
  }, [selectedDate]);
}

function MonthlyStats({ selectedDate }: { selectedDate: Date }) {
  const stats = useMonthStats(selectedDate);

  const kpis = [
    {
      label: 'Cumplimiento',
      value: stats.pct !== null ? `${stats.pct}%` : '—',
      sub: stats.totalPlanned > 0 ? `${stats.totalDone}/${stats.totalPlanned} tareas` : 'Sin tareas aún',
      color: stats.pct === null ? 'border-l-gray-300' : stats.pct >= 80 ? 'border-l-green-500' : stats.pct >= 50 ? 'border-l-amber-400' : 'border-l-red-400',
      icon: <CheckCircle2 size={14} className="text-text-muted" />,
    },
    {
      label: 'No planificadas',
      value: String(stats.totalUnplanned),
      sub: 'completadas este mes',
      color: 'border-l-purple-400',
      icon: <Zap size={14} className="text-purple-400" />,
    },
    {
      label: 'Días activos',
      value: String(stats.daysActive),
      sub: `de ${new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()} días`,
      color: 'border-l-blue-400',
      icon: <Clock size={14} className="text-blue-400" />,
    },
    {
      label: 'Estado de ánimo',
      value: stats.avgMood ? MOOD_EMOJI[stats.avgMood] : '—',
      sub: stats.avgMood ? MOOD_LABEL[stats.avgMood] + ' (promedio)' : 'Sin registros',
      color: 'border-l-teal-400',
      icon: <SmilePlus size={14} className="text-teal-400" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map(k => (
        <div key={k.label} className={clsx('bg-white border border-border rounded-xl p-3 border-l-4', k.color)}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{k.label}</span>
            {k.icon}
          </div>
          <p className="text-xl font-bold text-text-primary leading-none">{k.value}</p>
          <p className="text-[10px] text-text-muted mt-0.5">{k.sub}</p>
        </div>
      ))}
    </div>
  );
}

function DailyDayPreview() {
  const { state } = usePlanner();
  const tasks    = state.dailyPlan?.tasks ?? [];
  const mood     = state.dailyPlan?.mood ?? null;
  const habits   = state.dailyPlan?.habitEntries ?? [];
  const day      = capitalizeFirst(formatDate(state.selectedDate, "EEEE d 'de' MMMM"));

  const planned     = tasks.filter(t => !t.unplanned);
  const unplanned   = tasks.filter(t => t.unplanned);
  const completed   = planned.filter(t => t.status === 'completada');
  const pct         = planned.length > 0 ? Math.round((completed.length / planned.length) * 100) : null;
  const habitsDone  = habits.filter(h => h.completed).length;

  if (tasks.length === 0 && !mood) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-text-muted">{day}</p>
        <p className="text-sm text-text-secondary mt-1">Sin registro este día</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Day header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-text-secondary">{day}</p>
        <div className="flex items-center gap-2">
          {mood && (
            <span className="text-sm" title={MOOD_LABEL[mood]}>{MOOD_EMOJI[mood]}</span>
          )}
          {habitsDone > 0 && (
            <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">
              {habitsDone} hábito{habitsDone !== 1 ? 's' : ''}
            </span>
          )}
          {pct !== null && (
            <span className={clsx(
              'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
              pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            )}>
              {pct}%
            </span>
          )}
        </div>
      </div>

      {/* Completion bar */}
      {planned.length > 0 && (
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className={clsx('h-full rounded-full transition-all', pct! >= 80 ? 'bg-green-500' : pct! >= 50 ? 'bg-amber-400' : 'bg-red-400')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Task list */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {planned.map(t => (
          <div key={t.id} className="flex items-center gap-2">
            <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0',
              t.status === 'completada' ? 'bg-green-500' :
              t.priority === 'alta' ? 'bg-red-400' : t.priority === 'media' ? 'bg-amber-400' : 'bg-gray-400'
            )} />
            <span className={clsx('text-xs flex-1 truncate', t.status === 'completada' ? 'line-through text-text-muted' : 'text-text-primary')}>
              {t.title}
            </span>
            {t.startTime && <span className="text-[9px] text-text-muted flex-shrink-0">{t.startTime}</span>}
          </div>
        ))}
        {unplanned.map(t => (
          <div key={t.id} className="flex items-center gap-2">
            <Zap size={10} className="text-purple-400 flex-shrink-0" />
            <span className={clsx('text-xs flex-1 truncate text-purple-700', t.status === 'completada' && 'line-through opacity-60')}>
              {t.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyObservaciones({ yearMonth, readOnly }: { yearMonth: string; readOnly: boolean }) {
  const { state, dispatch } = usePlanner();
  const [text, setText] = useState(state.monthlyPlan?.observaciones ?? '');

  // Sync text when the month changes
  useEffect(() => {
    setText(state.monthlyPlan?.observaciones ?? '');
  }, [yearMonth, state.monthlyPlan?.observaciones]);

  // Persist through context so PlannerContext's useEffect saves it together with the rest of monthlyPlan
  function handleChange(value: string) {
    setText(value);
    const base = state.monthlyPlan ?? { yearMonth, goals: [] };
    dispatch({ type: 'LOAD_MONTHLY', plan: { ...base, observaciones: value } });
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Observaciones del mes</p>
      <textarea
        className="w-full text-xs text-text-primary resize-none focus:outline-none bg-transparent leading-relaxed min-h-[80px] placeholder:text-text-muted"
        value={text}
        readOnly={readOnly}
        placeholder={readOnly ? '' : 'Notas, logros o pendientes del mes…'}
        onChange={e => handleChange(e.target.value)}
      />
    </div>
  );
}

export function MonthlyPage() {
  const { state, isReadOnly } = usePlanner();
  const yearMonth = toYearMonth(state.selectedDate);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-4">

        {/* Stats bar */}
        <MonthlyStats selectedDate={state.selectedDate} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Calendar + day preview */}
          <div className="lg:col-span-2 space-y-4">
            <CalendarGrid />
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <DailyDayPreview />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-xl p-4">
              <MilestoneList yearMonth={yearMonth} readOnly={isReadOnly} />
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <MonthlyGoals />
            </div>
            <MonthlyObservaciones yearMonth={yearMonth} readOnly={isReadOnly} />
          </div>
        </div>

      </div>
    </div>
  );
}
