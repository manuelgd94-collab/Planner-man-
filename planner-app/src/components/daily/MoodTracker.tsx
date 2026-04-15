import { clsx } from 'clsx';
import { usePlanner } from '../../store/PlannerContext';

const MOODS: { value: 1 | 2 | 3 | 4 | 5; emoji: string; label: string }[] = [
  { value: 1, emoji: '😔', label: 'Mal' },
  { value: 2, emoji: '😕', label: 'Regular' },
  { value: 3, emoji: '😐', label: 'Normal' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Excelente' },
];

export function MoodTracker() {
  const { state, setMood } = usePlanner();
  const current = state.dailyPlan?.mood;

  return (
    <div>
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">¿Cómo te sientes?</span>
      <div className="flex gap-2">
        {MOODS.map(m => (
          <button
            key={m.value}
            onClick={() => setMood(m.value)}
            title={m.label}
            className={clsx(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all flex-1',
              current === m.value
                ? 'bg-gray-900 text-white'
                : 'hover:bg-surface-secondary text-text-secondary'
            )}
          >
            <span className="text-lg">{m.emoji}</span>
            <span className="text-[10px] font-medium">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
