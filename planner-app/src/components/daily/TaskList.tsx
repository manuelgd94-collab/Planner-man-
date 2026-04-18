import { useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { TaskForm } from './TaskForm';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { usePlanner } from '../../store/PlannerContext';
import { toISODate } from '../../utils/dateUtils';

export function TaskList() {
  const { state, addTask, updateTask, deleteTask, toggleTask, isReadOnly } = usePlanner();
  const [showForm, setShowForm] = useState(false);
  const dateKey = toISODate(state.selectedDate);
  const tasks = state.dailyPlan?.tasks ?? [];

  const active = tasks.filter(t => t.status !== 'completada' && t.status !== 'reprogramada');
  const scheduled   = active.filter(t => !!t.startTime);
  const unscheduled = active.filter(t => !t.startTime);
  const completed   = tasks.filter(t => t.status === 'completada');

  function renderTask(task: (typeof tasks)[number]) {
    return (
      <TaskItem
        key={task.id}
        task={task}
        onToggle={() => toggleTask(task.id)}
        onUpdate={updateTask}
        onDelete={() => deleteTask(task.id)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Tareas</span>
          <span className="text-xs text-text-muted bg-surface-tertiary px-1.5 py-0.5 rounded-full">
            {active.length} pendientes
          </span>
        </div>
        {!isReadOnly && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} />
            Agregar
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<Circle size={32} strokeWidth={1} />}
          title="Sin tareas por hoy"
          description="¡Agrega tu primera tarea para comenzar!"
          action={<Button variant="primary" size="sm" onClick={() => setShowForm(true)}>Agregar tarea</Button>}
        />
      ) : (
        <div className="space-y-0.5">
          {/* Scheduled tasks */}
          {scheduled.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 px-2.5 pt-1 pb-0.5">
                <Clock size={10} className="text-blue-400" />
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                  Con horario ({scheduled.length})
                </span>
              </div>
              {scheduled.map(renderTask)}
            </>
          )}

          {/* Unscheduled tasks */}
          {unscheduled.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 px-2.5 pt-1 pb-0.5">
                <AlertCircle size={10} className="text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
                  Sin programar ({unscheduled.length})
                </span>
              </div>
              {unscheduled.map(renderTask)}
            </>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <details className="mt-2" open={active.length === 0}>
              <summary className="text-xs text-text-muted cursor-pointer select-none flex items-center gap-1.5 px-3 py-1 hover:text-text-secondary">
                <CheckCircle2 size={12} />
                {completed.length} completada{completed.length > 1 ? 's' : ''}
              </summary>
              <div className="space-y-0.5 mt-1">
                {completed.map(renderTask)}
              </div>
            </details>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva tarea">
        <TaskForm
          dueDate={dateKey}
          onSubmit={data => { addTask(data); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
