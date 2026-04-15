import { useState } from 'react';
import { Plus, Flame, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { Habit } from '../../types';
import { usePlanner } from '../../store/PlannerContext';
import { toISODate, getWeekDays, formatDate, isTodayUtil } from '../../utils/dateUtils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { COLORES_HABITO } from '../../utils/constants';

const COLOR_MAP: Record<string, string> = {
  blue: '#3B82F6',
  green: '#22C55E',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F97316',
  red: '#EF4444',
  yellow: '#EAB308',
  indigo: '#6366F1',
};

function getStreak(habitId: string, entries: { habitId: string; date: string; completed: boolean }[]): number {
  const today = new Date();
  let streak = 0;
  let d = new Date(today);
  while (true) {
    const key = toISODate(d);
    const entry = entries.find(e => e.habitId === habitId && e.date === key && e.completed);
    if (!entry) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

interface HabitFormProps {
  onSubmit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

function HabitForm({ onSubmit, onCancel }: HabitFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [icon, setIcon] = useState('');

  return (
    <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; onSubmit({ name: name.trim(), color, icon: icon || undefined, frequency: 'diaria' }); }} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Nombre del hábito *</label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Meditar, Ejercicio..." className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400" />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Emoji (opcional)</label>
        <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🧘" className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400" />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORES_HABITO.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={clsx('w-6 h-6 rounded-full transition-all', color === c && 'ring-2 ring-offset-1 ring-gray-900')}
              style={{ backgroundColor: COLOR_MAP[c] }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" size="sm">Crear hábito</Button>
      </div>
    </form>
  );
}

export function HabitTracker() {
  const { state, addHabit, deleteHabit, toggleHabitEntry, isReadOnly } = usePlanner();
  const [showForm, setShowForm] = useState(false);
  const weekDays = getWeekDays(state.selectedDate);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Hábitos</span>
        {!isReadOnly && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} />
            Agregar
          </Button>
        )}
      </div>

      {state.habits.filter(h => !h.archivedAt).length === 0 ? (
        <EmptyState
          icon={<Flame size={28} strokeWidth={1} />}
          title="Sin hábitos"
          description="Construye rutinas con seguimiento diario"
          action={<Button variant="primary" size="sm" onClick={() => setShowForm(true)}>Crear hábito</Button>}
        />
      ) : (
        <div className="space-y-1">
          {/* Week header */}
          <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: '1fr repeat(7, 28px)' }}>
            <div />
            {weekDays.map(day => (
              <div key={day.toISOString()} className={clsx(
                'text-center text-xs font-medium',
                isTodayUtil(day) ? 'text-gray-900' : 'text-text-muted'
              )}>
                {formatDate(day, 'EEE').charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          {state.habits.filter(h => !h.archivedAt).map(habit => {
            const streak = getStreak(habit.id, state.habitEntries);
            const color = COLOR_MAP[habit.color] ?? '#6366f1';
            return (
              <div key={habit.id} className="group grid gap-1 items-center" style={{ gridTemplateColumns: '1fr repeat(7, 28px)' }}>
                <div className="flex items-center gap-1.5 min-w-0">
                  {habit.icon && <span className="text-sm">{habit.icon}</span>}
                  <span className="text-xs font-medium text-text-primary truncate">{habit.name}</span>
                  {streak > 0 && (
                    <span className="text-xs text-orange-500 flex items-center gap-0.5 flex-shrink-0">
                      <Flame size={10} />
                      {streak}
                    </span>
                  )}
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-500 p-0.5"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                {weekDays.map(day => {
                  const dateKey = toISODate(day);
                  const entry = state.habitEntries.find(e => e.habitId === habit.id && e.date === dateKey);
                  const done = entry?.completed ?? false;
                  const isToday = isTodayUtil(day);
                  return (
                    <button
                      key={dateKey}
                      onClick={() => toggleHabitEntry(habit.id, dateKey)}
                      className={clsx(
                        'w-7 h-7 rounded-full border transition-all flex items-center justify-center',
                        done ? 'border-transparent' : isToday ? 'border-gray-300 hover:border-gray-400' : 'border-border hover:border-gray-300'
                      )}
                      style={done ? { backgroundColor: color } : {}}
                      title={formatDate(day, 'EEEE d')}
                    >
                      {done && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo hábito">
        <HabitForm onSubmit={h => { addHabit(h); setShowForm(false); }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
