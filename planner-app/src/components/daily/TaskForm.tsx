import { useState, type FormEvent } from 'react';
import type { Task, Priority, TaskStatus } from '../../types';
import { Button } from '../ui/Button';
import { PRIORIDAD_LABELS, ESTADO_LABELS } from '../../utils/constants';

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
      completedAt: initial?.completedAt,
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
          rows={3}
          className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 transition-colors resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Prioridad</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as Priority)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white"
          >
            {(Object.keys(PRIORIDAD_LABELS) as Priority[]).map(p => (
              <option key={p} value={p}>{PRIORIDAD_LABELS[p]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Estado</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as TaskStatus)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white"
          >
            {(Object.keys(ESTADO_LABELS) as TaskStatus[]).map(s => (
              <option key={s} value={s}>{ESTADO_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" size="sm">
          {initial ? 'Guardar cambios' : 'Agregar tarea'}
        </Button>
      </div>
    </form>
  );
}
