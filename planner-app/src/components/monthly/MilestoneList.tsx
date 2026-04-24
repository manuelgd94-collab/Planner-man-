import { useState } from 'react';
import { Plus, X, Calendar, Truck, Users, CheckCircle2, Star } from 'lucide-react';
import { clsx } from 'clsx';
import { usePlanner } from '../../store/PlannerContext';
import type { Milestone, MilestoneType } from '../../types';
import { formatDate, capitalizeFirst } from '../../utils/dateUtils';

const TYPE_CONFIG: Record<MilestoneType, { label: string; icon: React.ReactNode; color: string }> = {
  entrega:    { label: 'Entrega',    icon: <Truck size={11} />,        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  inspeccion: { label: 'Inspección', icon: <CheckCircle2 size={11} />, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  reunion:    { label: 'Reunión',    icon: <Users size={11} />,        color: 'bg-purple-100 text-purple-700 border-purple-200' },
  cierre:     { label: 'Cierre',     icon: <Calendar size={11} />,     color: 'bg-red-100 text-red-700 border-red-200' },
  otro:       { label: 'Otro',       icon: <Star size={11} />,         color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

interface MilestoneListProps {
  yearMonth: string;
  readOnly: boolean;
}

export function MilestoneList({ yearMonth, readOnly }: MilestoneListProps) {
  const { state, dispatch } = usePlanner();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', date: '', type: 'entrega' as MilestoneType });

  const monthlyPlan = state.monthlyPlan ?? { yearMonth, goals: [] };
  const milestones = (monthlyPlan.milestones ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));

  function saveMilestones(updated: Milestone[]) {
    dispatch({ type: 'LOAD_MONTHLY', plan: { ...monthlyPlan, milestones: updated } });
  }

  function addMilestone() {
    if (!draft.title.trim() || !draft.date) return;
    const next: Milestone = { id: crypto.randomUUID(), ...draft, title: draft.title.trim() };
    saveMilestones([...(monthlyPlan.milestones ?? []), next]);
    setDraft({ title: '', date: '', type: 'entrega' });
    setAdding(false);
  }

  function deleteMilestone(id: string) {
    saveMilestones((monthlyPlan.milestones ?? []).filter(m => m.id !== id));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Hitos del mes</span>
        {!readOnly && (
          <button
            onClick={() => setAdding(v => !v)}
            className="p-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {adding && (
        <div className="border border-border rounded-lg p-2 space-y-1.5 bg-gray-50">
          <input
            type="date"
            value={draft.date}
            onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
            className="w-full text-xs border border-border rounded px-2 py-1 outline-none focus:border-gray-400 bg-white"
          />
          <input
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addMilestone()}
            placeholder="Descripción del hito..."
            className="w-full text-xs border border-border rounded px-2 py-1 outline-none focus:border-gray-400 bg-white"
          />
          <select
            value={draft.type}
            onChange={e => setDraft(d => ({ ...d, type: e.target.value as MilestoneType }))}
            className="w-full text-xs border border-border rounded px-2 py-1 outline-none focus:border-gray-400 bg-white"
          >
            {(Object.keys(TYPE_CONFIG) as MilestoneType[]).map(t => (
              <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
            ))}
          </select>
          <div className="flex gap-1">
            <button
              onClick={addMilestone}
              disabled={!draft.title.trim() || !draft.date}
              className="flex-1 text-xs py-1 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              Agregar
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-2 text-xs py-1 rounded border border-border text-text-muted hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {milestones.length === 0 && !adding && (
        <p className="text-xs text-text-muted italic text-center py-2">Sin hitos este mes</p>
      )}

      <div className="space-y-1">
        {milestones.map(m => {
          const cfg = TYPE_CONFIG[m.type];
          const dateLabel = capitalizeFirst(formatDate(new Date(m.date + 'T12:00:00'), 'd MMM'));
          return (
            <div key={m.id} className="flex items-center gap-2 group">
              <span className="text-[10px] text-text-muted w-10 flex-shrink-0 font-medium">{dateLabel}</span>
              <span className={clsx('flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0', cfg.color)}>
                {cfg.icon}
              </span>
              <span className="text-xs text-text-primary flex-1 truncate">{m.title}</span>
              {!readOnly && (
                <button
                  onClick={() => deleteMilestone(m.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-red-500 transition-opacity flex-shrink-0"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
