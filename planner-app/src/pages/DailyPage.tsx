import { TaskList } from '../components/daily/TaskList';
import { HabitTracker } from '../components/daily/HabitTracker';
import { DailyNotes } from '../components/daily/DailyNotes';
import { MoodTracker } from '../components/daily/MoodTracker';
import { TimeBlocks } from '../components/daily/TimeBlocks';

export function DailyPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Mood */}
        <div className="bg-white border border-border rounded-xl p-4">
          <MoodTracker />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks */}
          <div className="lg:col-span-1 bg-white border border-border rounded-xl p-4">
            <TaskList />
          </div>

          {/* Habits */}
          <div className="lg:col-span-1 bg-white border border-border rounded-xl p-4">
            <HabitTracker />
          </div>

          {/* Notes */}
          <div className="lg:col-span-1 bg-white border border-border rounded-xl p-4">
            <DailyNotes />
          </div>
        </div>

        {/* Time blocks */}
        <div className="bg-white border border-border rounded-xl p-4 relative">
          <TimeBlocks />
        </div>
      </div>
    </div>
  );
}
