import { useState, type FormEvent } from 'react';
import type { Goal, GoalStatus, Quarter } from '../../types';
import { Button } from '../ui/Button';
import { CATEGORIAS_OBJETIVO, COLORES_OBJETIVO, ESTADO_OBJETIVO_LABELS } from '../../utils/constants';
import { clsx } from 'clsx';

interface GoalFormProps {
  initial?: Partial<Goal>;
  scope: 'monthly' | 'annual';
  quarter?: Quarter;
  onSubmit: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  year?: number;
  month?: number;
}

export function GoalForm({ initial, scope, quarter, onSubmit, onCancel, year, month }: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<GoalStatus>(initial?.status ?? 'no_iniciada');
  const [progress, setProgress] = useState(initial?.progress ?? 0);
  const [category, setCategory] = useState(initial?.category ?? '');
  const [color, setColor] = useState(initial?.color ?? COLORES_OBJETIVO[0]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      progress,
      scope: scope === 'monthly' ? 'mensual' : 'anual',
      year: year ?? new Date().getFullYear(),
      quarter: scope === 'annual' ? quarter : undefined,
      month: scope === 'monthly' ? month : undefined,
      category: category || undefined,
      color,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Objetivo *</label>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="¿Qué quieres lograr?" className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Descripción</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe tu objetivo..." rows={2} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Estado</label>
          <select value={status} onChange={e => setStatus(e.target.value as GoalStatus)} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none bg-white">
            {(Object.keys(ESTADO_OBJETIVO_LABELS) as GoalStatus[]).map(s => (
              <option key={s} value={s}>{ESTADO_OBJETIVO_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Categoría</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none bg-white">
            <option value="">Sin categoría</option>
            {CATEGORIAS_OBJETIVO.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Progreso: {progress}%</label>
        <input type="range" min={0} max={100} step={5} value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-full accent-gray-900" />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORES_OBJETIVO.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={clsx('w-6 h-6 rounded-full transition-all', color === c && 'ring-2 ring-offset-1 ring-gray-900')}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" size="sm">{initial ? 'Guardar' : 'Crear objetivo'}</Button>
      </div>
    </form>
  );
}
