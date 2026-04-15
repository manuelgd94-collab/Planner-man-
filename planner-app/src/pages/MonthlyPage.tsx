import { CalendarGrid } from '../components/monthly/CalendarGrid';
import { MonthlyGoals } from '../components/monthly/MonthlyGoals';
import { usePlanner } from '../store/PlannerContext';
import { formatDate, capitalizeFirst } from '../utils/dateUtils';

export function MonthlyPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 space-y-4">
            <CalendarGrid />
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <DailyDayPreview />
            </div>
          </div>

          {/* Goals sidebar */}
          <div className="bg-white border border-border rounded-xl p-4">
            <MonthlyGoals />
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyDayPreview() {
  const { state } = usePlanner();
  const tasks = state.dailyPlan?.tasks ?? [];
  const day = capitalizeFirst(formatDate(state.selectedDate, "EEEE d 'de' MMMM"));

  if (tasks.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-text-muted">{day}</p>
        <p className="text-sm text-text-secondary mt-1">Sin tareas este día</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-xs font-medium text-text-muted mb-2">{day}</p>
      <div className="space-y-1">
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 text-sm">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              t.priority === 'alta' ? 'bg-red-500' : t.priority === 'media' ? 'bg-amber-400' : 'bg-green-500'
            }`} />
            <span className={t.status === 'completada' ? 'line-through text-text-muted' : 'text-text-primary'}>
              {t.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
