import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Quarter } from '../types';
import { QuarterPanel } from '../components/annual/QuarterPanel';
import { AnnualSummary } from '../components/annual/AnnualSummary';
import { usePlanner } from '../store/PlannerContext';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export function AnnualPage() {
  const { state, dispatch } = usePlanner();
  const year = state.selectedDate.getFullYear();

  const prevYear = () => {
    const d = new Date(state.selectedDate);
    d.setFullYear(d.getFullYear() - 1);
    dispatch({ type: 'SET_DATE', date: d });
  };

  const nextYear = () => {
    const d = new Date(state.selectedDate);
    d.setFullYear(d.getFullYear() + 1);
    dispatch({ type: 'SET_DATE', date: d });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Year navigation */}
        <div className="flex items-center gap-3">
          <button onClick={prevYear} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-2xl font-bold text-text-primary">{year}</h2>
          <button onClick={nextYear} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Summary bar */}
        <AnnualSummary />

        {/* 4 quarters grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {QUARTERS.map(q => (
            <QuarterPanel key={q} quarter={q} year={year} />
          ))}
        </div>
      </div>
    </div>
  );
}
