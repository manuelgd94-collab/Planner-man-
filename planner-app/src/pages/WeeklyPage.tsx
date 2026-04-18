import { useMemo, useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { usePlanner } from '../store/PlannerContext';
import { getWeekDays, toISODate, formatDate, capitalizeFirst } from '../utils/dateUtils';
import { getItem, setItem, KEYS } from '../store/localStorage';
import type { DailyPlan, WeeklyPlan } from '../types';
import { WeekDayColumn } from '../components/weekly/WeekDayColumn';

export function WeeklyPage() {
  const { state, dispatch, isReadOnly } = usePlanner();
  const weekDays = useMemo(() => getWeekDays(state.selectedDate), [state.selectedDate]);
  const weekStart = toISODate(weekDays[0]);

  const plans = useMemo(() => {
    return weekDays.map(day => getItem<DailyPlan>(KEYS.daily(toISODate(day))));
  }, [weekDays]);

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(() =>
    getItem<WeeklyPlan>(KEYS.weekly(weekStart)) ?? { weekStart, objetivo: '', pendientes: '', emergencias: '' }
  );

  useEffect(() => {
    setWeeklyPlan(
      getItem<WeeklyPlan>(KEYS.weekly(weekStart)) ?? { weekStart, objetivo: '', pendientes: '', emergencias: '' }
    );
  }, [weekStart]);

  function updateField(field: keyof Omit<WeeklyPlan, 'weekStart'>, value: string) {
    const updated = { ...weeklyPlan, [field]: value };
    setWeeklyPlan(updated);
    setItem(KEYS.weekly(weekStart), updated);
  }

  // Show only past days within this week that have pending/in-progress tasks
  const overdueTasks = useMemo(() => {
    const todayISO = toISODate(new Date());
    const groups: { date: string; label: string; tasks: { id: string; title: string; priority: string }[] }[] = [];
    for (const day of weekDays) {
      const iso = toISODate(day);
      if (iso >= todayISO) continue; // only days already passed
      const plan = getItem<DailyPlan>(KEYS.daily(iso));
      const pending = (plan?.tasks ?? []).filter(t => t.status === 'pendiente' || t.status === 'en_progreso');
      if (pending.length > 0) {
        groups.push({
          date: iso,
          label: capitalizeFirst(formatDate(new Date(iso + 'T12:00:00'), 'EEEE d MMM')),
          tasks: pending.map(t => ({ id: t.id, title: t.title, priority: t.priority })),
        });
      }
    }
    return groups;
  }, [weekDays]);

  const weekLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} – ${last.getDate()} de ${capitalizeFirst(formatDate(first, 'MMMM yyyy'))}`;
    }
    return `${first.getDate()} ${capitalizeFirst(formatDate(first, 'MMM'))} – ${last.getDate()} ${capitalizeFirst(formatDate(last, 'MMM yyyy'))}`;
  }, [weekDays]);

  const totalOverdue = overdueTasks.reduce((s, g) => s + g.tasks.length, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 space-y-4">
        <p className="text-xs text-text-muted">{weekLabel} · Haz clic en un día para editarlo</p>

        {/* Note boxes */}
        <div className="grid grid-cols-3 gap-3">
          <NoteBox
            label="Objetivos semanales"
            value={weeklyPlan.objetivo}
            onChange={v => updateField('objetivo', v)}
            readOnly={isReadOnly}
            headerClass="bg-green-700 text-white"
            borderClass="border-green-400"
          />
          <NoteBox
            label="Elementos pendientes"
            value={weeklyPlan.pendientes}
            onChange={v => updateField('pendientes', v)}
            readOnly={isReadOnly}
            headerClass="bg-green-700 text-white"
            borderClass="border-green-400"
          />
          <NoteBox
            label="Emergencias"
            value={weeklyPlan.emergencias}
            onChange={v => updateField('emergencias', v)}
            readOnly={isReadOnly}
            headerClass="bg-red-600 text-white"
            borderClass="border-red-400"
          />
        </div>

        {/* 7-day grid */}
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => (
            <WeekDayColumn
              key={day.toISOString()}
              date={day}
              plan={plans[i]}
              onSelectDay={d => { dispatch({ type: 'SET_DATE', date: d }); dispatch({ type: 'SET_VIEW', view: 'diario' }); }}
            />
          ))}
        </div>

        {/* Overdue tasks */}
        {totalOverdue > 0 && (
          <div className="border border-amber-300 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-amber-200 bg-amber-50 flex items-center gap-2">
              <Clock size={14} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Tareas atrasadas</span>
              <span className="ml-1 text-xs bg-amber-200 text-amber-800 rounded-full px-2 py-0.5 font-medium">
                {totalOverdue}
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
              {overdueTasks.map(group => (
                <div key={group.date}>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1.5">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.tasks.map(t => (
                      <div key={t.id} className="flex items-start gap-1.5">
                        <AlertCircle size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-text-primary leading-tight">{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteBox({
  label, value, onChange, readOnly, headerClass, borderClass,
}: {
  label: string; value: string; onChange: (v: string) => void;
  readOnly: boolean; headerClass: string; borderClass: string;
}) {
  return (
    <div className={`border rounded-xl overflow-hidden ${borderClass}`}>
      <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wide text-center ${headerClass}`}>
        {label}
      </div>
      <textarea
        className="w-full px-3 py-2.5 text-xs text-text-primary resize-none focus:outline-none bg-white min-h-[130px] leading-relaxed"
        value={value}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={readOnly ? '' : 'Un ítem por línea...'}
      />
    </div>
  );
}
