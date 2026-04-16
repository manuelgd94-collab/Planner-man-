import { useState, type FormEvent } from 'react';
import type { Task, Priority, TaskStatus, RecurrenceRule } from '../../types';
import { Button } from '../ui/Button';
import { PRIORIDAD_LABELS, ESTADO_LABELS } from '../../utils/constants';

// Time slots every 30min from 06:00 to 22:00
const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  mensual: 'Mensual',
};

interface TaskFormProps {
  initial?: Partial<Task>;
  onSubmit: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  dueDate: string;
}

export function TaskForm({ initial, onSubmit, onCancel, dueDate }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'media');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'pendiente');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | ''>(initial?.recurrenceRule ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status,
      dueDate,
      tags: [],
      startTime: startTime || undefined,
      recurrenceRule: recurrenceRule || undefined,
      completedAt: initial?.completedAt,
      templateId: initial?.templateId,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Título *</label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="¿Qué hay que hacer?"
          className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Descripción</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Detalles opcionales..."
          rows={2}
          className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 transition-colors resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Prioridad</label>
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white">
            {(Object.keys(PRIORIDAD_LABELS) as Priority[]).map(p => (
              <option key={p} value={p}>{PRIORIDAD_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Estado</label>
          <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white">
            {(Object.keys(ESTADO_LABELS) as TaskStatus[]).map(s => (
              <option key={s} value={s}>{ESTADO_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Hora de inicio</label>
          <select value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white">
            <option value="">Sin horario</option>
            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Recurrencia</label>
          <select value={recurrenceRule} onChange={e => setRecurrenceRule(e.target.value as RecurrenceRule | '')} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white">
            <option value="">Sin repetición</option>
            {(Object.keys(RECURRENCE_LABELS) as RecurrenceRule[]).map(r => (
              <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>

      {recurrenceRule && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
          Esta tarea se agregará automáticamente cada vez que corresponda según la recurrencia.
        </p>
      )}

      <div className="flex gap-2 pt-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" size="sm">
          {initial ? 'Guardar cambios' : 'Agregar tarea'}
        </Button>
      </div>
    </form>
  );
}
