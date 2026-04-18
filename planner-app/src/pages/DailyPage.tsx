import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { TaskList } from '../components/daily/TaskList';
import { HabitTracker } from '../components/daily/HabitTracker';
import { DailyNotes } from '../components/daily/DailyNotes';
import { MoodTracker } from '../components/daily/MoodTracker';
import { TimeBlocks } from '../components/daily/TimeBlocks';
import { ShiftSummary } from '../components/daily/ShiftSummary';
import { OverdueTasks } from '../components/daily/OverdueTasks';
import { usePlanner } from '../store/PlannerContext';
import { toISODate, formatDate, capitalizeFirst } from '../utils/dateUtils';

export function DailyPage() {
  const { state } = usePlanner();
  const [showSummary, setShowSummary] = useState(false);
  const dateStr = toISODate(state.selectedDate);
  const dateLabel = capitalizeFirst(formatDate(state.selectedDate, "EEEE d 'de' MMMM"));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-secondary">{dateLabel}</p>
          <button
            onClick={() => setShowSummary(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            <ClipboardList size={13} />
            Resumen de turno
          </button>
        </div>

        {/* Mood */}
        <div className="bg-white border border-border rounded-xl p-4">
          <MoodTracker />
        </div>

        {/* Main grid — tasks wider */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
            <div className="bg-white border border-border rounded-xl p-4">
              <TaskList />
            </div>
            <OverdueTasks />
          </div>
          <div className="col-span-12 lg:col-span-4 bg-white border border-border rounded-xl p-4">
            <HabitTracker />
          </div>
          <div className="col-span-12 lg:col-span-3 bg-white border border-border rounded-xl p-4">
            <DailyNotes />
          </div>
        </div>

        {/* Time blocks */}
        <div className="bg-white border border-border rounded-xl p-4 relative">
          <TimeBlocks />
        </div>
      </div>

      <ShiftSummary
        open={showSummary}
        onClose={() => setShowSummary(false)}
        date={dateStr}
      />
    </div>
  );
}
