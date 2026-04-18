import { useState, type KeyboardEvent } from 'react';
import { Plus, X, Check, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { WeeklyItem } from '../../types';

interface WeeklyItemListProps {
  items: WeeklyItem[];
  variant: 'pendientes' | 'emergencias';
  readOnly: boolean;
  onChange: (items: WeeklyItem[]) => void;
}

export function WeeklyItemList({ items, variant, readOnly, onChange }: WeeklyItemListProps) {
  const [draft, setDraft] = useState('');

  const isPendiente = variant === 'pendientes';

  function addItem() {
    const title = draft.trim();
    if (!title) return;
    onChange([...items, {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    }]);
    setDraft('');
  }

  function toggleItem(id: string) {
    onChange(items.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  }

  function deleteItem(id: string) {
    onChange(items.filter(i => i.id !== id));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') addItem();
  }

  const pending = items.filter(i => !i.completed);
  const done    = items.filter(i => i.completed);
  const pct     = items.length > 0 ? Math.round((done.length / items.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full gap-2">

      {items.length === 0 && (
        <p className="text-xs text-text-muted text-center pt-3 italic">
          {readOnly
            ? 'Sin elementos'
            : isPendiente
              ? 'Agrega obligaciones pendientes...'
              : 'Sin emergencias esta semana'}
        </p>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto min-h-0">
        {/* Pending items */}
        {pending.map(item => (
          <div
            key={item.id}
            className={clsx(
              'flex items-start gap-2 group rounded-lg px-2 py-1.5 transition-colors',
              isPendiente ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'
            )}
          >
            <button
              onClick={() => !readOnly && toggleItem(item.id)}
              disabled={readOnly}
              className={clsx(
                'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                isPendiente
                  ? 'border-green-500 hover:bg-green-200 disabled:cursor-default'
                  : 'border-red-500 hover:bg-red-200 disabled:cursor-default'
              )}
            />

            <div className="flex-1 min-w-0">
              <span className="text-xs text-text-primary leading-snug break-words font-medium">
                {item.title}
              </span>
              {item.carriedOver && (
                <span
                  title="Arrastrado de semana anterior"
                  className={clsx(
                    'ml-1 inline-flex items-center gap-0.5 text-[9px] px-1 rounded font-medium',
                    isPendiente ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                  )}
                >
                  <ArrowLeftRight size={7} /> sem. anterior
                </span>
              )}
            </div>

            {!readOnly && (
              <button
                onClick={() => deleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded text-text-muted hover:text-red-500 transition-opacity"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}

        {/* Completed items */}
        {done.length > 0 && (
          <div className={clsx('space-y-1', pending.length > 0 && 'mt-1 pt-1 border-t border-border')}>
            {done.map(item => (
              <div key={item.id} className="flex items-start gap-2 group rounded-lg px-2 py-1.5 bg-gray-50 opacity-60">
                <button
                  onClick={() => !readOnly && toggleItem(item.id)}
                  disabled={readOnly}
                  className={clsx(
                    'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                    isPendiente ? 'bg-green-500 border-green-500' : 'bg-red-500 border-red-500',
                    'disabled:cursor-default'
                  )}
                >
                  <Check size={10} className="text-white" />
                </button>
                <span className="flex-1 text-xs text-text-muted line-through leading-snug break-words">
                  {item.title}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded text-text-muted hover:text-red-500 transition-opacity"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                isPendiente ? 'bg-green-500' : 'bg-red-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-text-muted flex-shrink-0">{done.length}/{items.length}</span>
        </div>
      )}

      {/* Add input */}
      {!readOnly && (
        <div className="flex gap-1 flex-shrink-0">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isPendiente ? 'Nueva obligación pendiente...' : 'Nueva emergencia...'}
            className="flex-1 text-xs border border-border rounded-lg px-2 py-1.5 outline-none focus:border-gray-400 bg-white"
          />
          <button
            onClick={addItem}
            disabled={!draft.trim()}
            className={clsx(
              'flex-shrink-0 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-40',
              isPendiente ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            )}
          >
            <Plus size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export function EmergenciaHeader() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <AlertTriangle size={12} />
      <span>Emergencias</span>
    </div>
  );
}
