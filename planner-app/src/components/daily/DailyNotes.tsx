import { useCallback } from 'react';
import type { NoteBlock } from '../../types';
import { BlockEditor } from '../blocks/BlockEditor';
import { usePlanner } from '../../store/PlannerContext';
import { toISODate } from '../../utils/dateUtils';

export function DailyNotes() {
  const { state, updateDailyNote } = usePlanner();
  const dateKey = toISODate(state.selectedDate);
  const blocks = state.dailyPlan?.note?.blocks ?? [];

  const handleChange = useCallback((newBlocks: NoteBlock[]) => {
    updateDailyNote(newBlocks, dateKey);
  }, [dateKey, updateDailyNote]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Notas</span>
      </div>
      <BlockEditor
        blocks={blocks}
        onChange={handleChange}
        placeholder="Escribe tus notas, reflexiones, ideas..."
      />
    </div>
  );
}
