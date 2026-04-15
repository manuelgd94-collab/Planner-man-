import { useState } from 'react';
import { History, CheckSquare, Flame, Target, FileText, Activity, Trash2 } from 'lucide-react';
import { getHistory } from '../store/historyLog';
import type { HistoryEntry } from '../types/history';
import { formatDate, parseISOUtil } from '../utils/dateUtils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

const CATEGORY_ICONS: Record<HistoryEntry['category'], React.ElementType> = {
  tarea: CheckSquare,
  habito: Flame,
  objetivo: Target,
  nota: FileText,
  estado: Activity,
};

const CATEGORY_COLORS: Record<HistoryEntry['category'], string> = {
  tarea: '#3B82F6',
  habito: '#F97316',
  objetivo: '#8B5CF6',
  nota: '#6B7280',
  estado: '#22C55E',
};

function groupByDate(entries: HistoryEntry[]): Record<string, HistoryEntry[]> {
  return entries.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
    const day = entry.timestamp.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});
}

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => getHistory());
  const [filter, setFilter] = useState<HistoryEntry['category'] | 'todos'>('todos');

  const filtered = filter === 'todos' ? entries : entries.filter(e => e.category === filter);
  const grouped = groupByDate(filtered);
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  function clearHistory() {
    localStorage.removeItem('planner:v1:history');
    setEntries([]);
  }

  const categories: { value: HistoryEntry['category'] | 'todos'; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'tarea', label: 'Tareas' },
    { value: 'habito', label: 'Hábitos' },
    { value: 'objetivo', label: 'Objetivos' },
    { value: 'nota', label: 'Notas' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Historial de actividad</h2>
            <p className="text-xs text-text-muted">{entries.length} registros guardados</p>
          </div>
          {entries.length > 0 && (
            <Button variant="danger" size="sm" onClick={clearHistory}>
              <Trash2 size={13} />
              Limpiar historial
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(c => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === c.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-border text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Entries */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<History size={32} strokeWidth={1} />}
            title="Sin actividad registrada"
            description="Las acciones que realices aparecerán aquí"
          />
        ) : (
          <div className="space-y-6">
            {sortedDays.map(day => {
              const dayEntries = grouped[day];
              const label = formatDate(parseISOUtil(day), "EEEE d 'de' MMMM yyyy");
              return (
                <div key={day}>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 capitalize">
                    {label}
                  </p>
                  <div className="bg-white border border-border rounded-xl overflow-hidden divide-y divide-border">
                    {dayEntries.map(entry => {
                      const Icon = CATEGORY_ICONS[entry.category];
                      const color = CATEGORY_COLORS[entry.category];
                      const time = formatDate(parseISOUtil(entry.timestamp), 'HH:mm');
                      return (
                        <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: `${color}20` }}>
                            <Icon size={13} style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">{entry.action}</p>
                            {entry.detail && (
                              <p className="text-xs text-text-secondary mt-0.5 truncate">{entry.detail}</p>
                            )}
                          </div>
                          <span className="text-xs text-text-muted flex-shrink-0 mt-0.5">{time}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
